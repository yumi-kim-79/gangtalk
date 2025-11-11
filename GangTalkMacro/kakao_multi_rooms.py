# -*- coding: utf-8 -*-
"""
kakao_multi_rooms.py
- 다중 카톡방 순회(정확명/접두어 화이트리스트)
- '💰💰💰 <업체명> 💰💰💰' 헤더 자동 인식(업체 제한 없음)
- 헤더에서 업체명 추출 → **해당 업체의 마지막 배너 블록만** 업로드
- 업로드 대상 2곳:
  1) status_board (원본 미리보기용)
  2) rooms_biz/<room_biz_id>/messages (실사용) + 루트 메타 업데이트(전문 저장)
- 중복 스킵 키: (방제목 + 업체명)
- 업로드 텍스트는 **첫 💰 헤더부터** 시작 (앞의 [작성자][시간] 제거)
- NEW:
  - dedup으로 스킵되더라도 rooms_biz에 **1회 백필(backfill)** 지원
  - 복사 우선순위: **Ctrl+A → Ctrl+C** 먼저, 부족하면 드래그 폴백
  - 루트 문서 lastPastedText/lastPasteMsgId/lastPastedAt 에 **전문** 저장
"""

import os
import re
import time
import json
import hashlib
from typing import List, Optional, Tuple, Dict, Set

# ============== 실행 옵션 ==============
DEBUG = False
POLL_INTERVAL_SEC = 2.0
MIN_TEXT_LEN = 300
FOCUS_TRIES = 3

# 백필/리셋 옵션
RESET_DEDUP_ON_START = False            # True로 하면 실행 시 dedup 초기화(1회용)
BACKFILL_ROOMS_BIZ_IF_DEDUP = True      # dedup 스킵이어도 rooms_biz에 1회 강제 업로드

# ============== 대상 방 ==============
WHITELIST_TITLES: List[str] = ["테스트 채팅"]     # 정확명
WHITELIST_PREFIXES: List[str] = ["테스트 채팅"]    # 접두어

DEDUP_CACHE_PATH = "dedup_cache.json"

# ============== 업로드 ==============
FIRESTORE_CFG = {"firestore": {"status_collection": "status_board"}}
SOURCE_TITLE_PREFIX = "카톡방:"

# ============== 외부 모듈 ==============
import pyperclip, pyautogui
import win32gui, win32con

# 파이어스토어 타임스탬프 사용
try:
    from google.cloud import firestore as gcf
    GCF_OK = True
except Exception:
    GCF_OK = False

try:
    from firestore_client import (
        init_firestore,
        post_status,
        post_rooms_biz_message,
        fetch_store_index,
    )
    FIRESTORE_OK = True
except Exception:
    FIRESTORE_OK = False


def log(s: str) -> None:
    t = time.strftime("%H:%M:%S")
    print(f"[{t}] {s}")


# ============== 헤더/업체 추출 ==============
HEADER_REGEX = re.compile(r"(?m)^\s*(?:.*💰){2,}.*$")  # 💰 2회 이상 → 헤더 라인
EMO_BLOCK    = re.compile(r"💰+\s*(.+?)\s*💰+")        # 💰 ... 💰 사이를 업체명으로
SEP_CLEAN    = re.compile(r"[\s\.\,·，ㆍ・/_\-|*~•]+")

def _clean_vendor(raw: str) -> str:
    return SEP_CLEAN.sub("", (raw or "").strip()).lower()

def find_headers(text: str) -> List[Tuple[int,int,str]]:
    headers=[]
    for m in HEADER_REGEX.finditer(text):
        s = text.rfind("\n", 0, m.start()) + 1
        e = text.find("\n", m.end())
        if e == -1: e = len(text)
        headers.append((s, e, text[s:e]))
    headers.sort(key=lambda x: x[0])
    return headers

def extract_vendor_from_header_line(line: str) -> Optional[str]:
    m = EMO_BLOCK.search(line)
    if not m: return None
    return _clean_vendor(m.group(1)) or None

def cut_block_from_first_header(block: str) -> str:
    """
    블록 내 '첫 헤더 라인'을 찾아 그 이전은 제거하고,
    헤더 라인 안에서도 첫 번째 💰 앞의 [작성자][시간] 등 프리픽스를 제거한다.
    """
    m = HEADER_REGEX.search(block)
    if not m:
        return block.strip()

    line_start = block.rfind("\n", 0, m.start()) + 1
    line_end = block.find("\n", m.end())
    if line_end == -1:
        line_end = len(block)

    header_line = block[line_start:line_end]

    idx = header_line.find("💰")
    if idx > 0:
        header_line = header_line[idx:]

    rest = block[line_end:]
    return (header_line + rest).lstrip()

def soft_normalize(text: str) -> str:
    t = "\n".join(ln.rstrip() for ln in text.splitlines())
    return re.sub(r"\n{3,}", "\n\n", t)

def find_last_banner_block_with_vendor(text: str) -> Optional[Tuple[int,int,str,str]]:
    headers = find_headers(text)
    if not headers: return None
    last_s, _, last_line = headers[-1]
    vendor = extract_vendor_from_header_line(last_line)
    if not vendor: return None

    # 다음 헤더 시작 전까지가 해당 블록
    next_start = None
    for s,_,_ in headers:
        if s > last_s:
            next_start = s
            break
    end = next_start if next_start is not None else len(text)

    block_raw = text[last_s:end].rstrip()
    block = cut_block_from_first_header(block_raw)
    return (last_s, end, block, vendor)


# ============== DeDup ==============
class DeDupCache:
    def __init__(self, path: str):
        self.path = path
        if os.path.exists(path):
            try:
                with open(path,"r",encoding="utf-8") as f:
                    self.db = json.load(f)
                if not isinstance(self.db, dict):
                    self.db = {}
            except Exception:
                self.db = {}
        else:
            self.db = {}

    @staticmethod
    def _hash(t: str) -> str:
        return hashlib.sha1(t.encode("utf-8","ignore")).hexdigest()

    def key(self, room: str, vendor: str) -> str:
        return f"{room}::{vendor}"

    def is_new(self, room: str, vendor: str, text: str) -> bool:
        return self.db.get(self.key(room, vendor)) != self._hash(text)

    def update(self, room: str, vendor: str, text: str) -> None:
        self.db[self.key(room, vendor)] = self._hash(text)
        try:
            with open(self.path,"w",encoding="utf-8") as f:
                json.dump(self.db,f,ensure_ascii=False,indent=2)
        except Exception:
            pass

    def reset(self):
        self.db = {}
        try:
            if os.path.exists(self.path):
                os.remove(self.path)
        except Exception:
            pass


# ============== 윈도우/복사 유틸 ==============
def _title_ok(title: str) -> bool:
    if title in WHITELIST_TITLES: return True
    return any(title.startswith(p) for p in WHITELIST_PREFIXES)

def enum_all_windows() -> List[Tuple[int,str]]:
    out=[]
    def _enum(hwnd,_):
        try:
            if win32gui.IsWindowVisible(hwnd):
                t = win32gui.GetWindowText(hwnd)
                if t: out.append((hwnd,t))
        except Exception: pass
    win32gui.EnumWindows(_enum,None)
    return out

def list_target_windows() -> List[Tuple[int,str,tuple]]:
    res=[]
    for hwnd,title in enum_all_windows():
        if _title_ok(title):
            try: rect = win32gui.GetWindowRect(hwnd)
            except Exception: rect=(0,0,0,0)
            res.append((hwnd,title,rect))
    return res

def bring_to_front(hwnd:int)->None:
    try:
        win32gui.ShowWindow(hwnd, win32con.SW_SHOWNOACTIVATE)
        win32gui.SetForegroundWindow(hwnd)
        time.sleep(0.12)
    except Exception: pass

def _click(rect, rx, ry, n=1, delay=0.02):
    L,T,R,B = rect
    x=int(L+(R-L)*rx); y=int(T+ (B-T)*ry)
    for _ in range(n):
        pyautogui.click(x, y); time.sleep(delay)

def copy_ctrl_a_c(rect: tuple, tries: int = FOCUS_TRIES) -> str:
    text=""
    for _ in range(tries):
        for (rx,ry) in [(0.5,0.55),(0.3,0.55),(0.7,0.55)]:
            _click(rect,rx,ry)
        pyautogui.hotkey("ctrl","a"); time.sleep(0.06)
        pyautogui.hotkey("ctrl","c"); time.sleep(0.12)
        text = pyperclip.paste() or ""
        if len(text) >= MIN_TEXT_LEN: break
    return text

def copy_wide_drag(rect: tuple, scale: float = 2.8) -> str:
    L,T,R,B = rect
    margin=28
    sx=int(R-margin); sy=int(B-margin)
    ex=int(L+margin); ey=int(T+margin+int(80*scale))
    pyautogui.moveTo(sx,sy); time.sleep(0.03)
    pyautogui.mouseDown(); time.sleep(0.03)
    pyautogui.moveTo(ex,ey,duration=0.22); time.sleep(0.03)
    pyautogui.mouseUp(); time.sleep(0.05)
    pyautogui.hotkey("ctrl","c"); time.sleep(0.12)
    return pyperclip.paste() or ""

def get_text_for_window(rect: tuple, first_pass: bool) -> str:
    """
    ✅ 항상 전체선택 복사(Ctrl+A, Ctrl+C) 먼저 시도 → 부족하면 드래그 폴백
    """
    # 1) 전체선택 복사 우선
    txt = copy_ctrl_a_c(rect, tries=FOCUS_TRIES)
    if len(txt) >= MIN_TEXT_LEN:
        return txt

    # 2) 드래그 폴백(첫 패스는 더 넓게)
    drag_scale = 3.2 if first_pass else 2.4
    txt = copy_wide_drag(rect, scale=drag_scale)
    if len(txt) >= MIN_TEXT_LEN:
        return txt

    # 3) 마지막 재시도: 전체선택 복사 한 번 더
    return copy_ctrl_a_c(rect, tries=FOCUS_TRIES)


# ============== Firestore 업로더 ==============
class Uploader:
    def __init__(self):
        self.db=None
        self.alias_to_room: Dict[str, str] = {}
        if FIRESTORE_OK:
            try:
                self.db = init_firestore()
                if self.db:
                    print("[Firestore] initialized")
                    self._load_vendor_index()
                else:
                    log("[경고] firestore_client 초기화 실패 → 업로드 스킵")
            except Exception as e:
                self.db=None; log(f"[경고] Firestore 모듈 문제: {e}")
        else:
            log("[경고] firestore_client 모듈 없음 → 업로드 스킵")

    def _load_vendor_index(self):
        try:
            items = fetch_store_index(self.db) or []
            for it in items:
                rid = str(it.get("room_biz_id") or "").strip()
                for alias in (it.get("aliases") or []):
                    key = _clean_vendor(alias)
                    if key:
                        self.alias_to_room[key] = rid
            print(f"[index] loaded alias map: {len(self.alias_to_room)} keys")
        except Exception as e:
            log(f"[index] load failed: {e}")

    def match_room_biz_id(self, cleaned_vendor: str) -> str:
        return self.alias_to_room.get(cleaned_vendor) or cleaned_vendor

    def upload_status(self, room_title: str, vendor_cleaned: str, block_text: str) -> str:
        if self.db is None: return ""
        source_title = f"{SOURCE_TITLE_PREFIX}{room_title}"
        return post_status(self.db, FIRESTORE_CFG,
                           source_title=source_title,
                           raw_text=block_text,
                           vendor=vendor_cleaned,
                           ts=None)

    def upload_rooms_biz(self, vendor_cleaned: str, block_text: str) -> bool:
        if self.db is None: return False

        room_biz_id = self.match_room_biz_id(vendor_cleaned)
        msg_id = post_rooms_biz_message(self.db, room_biz_id=room_biz_id, text=block_text)

        if not msg_id:
            return False

        # ✅ 루트 문서에 전문/메타 동기화 (잘림 방지)
        try:
            if GCF_OK:
                self.db.collection('rooms_biz').document(room_biz_id).set({
                    'lastPasteMsgId': msg_id,
                    'lastPastedText': block_text,                               # 전체 본문
                    'lastPastedAt': gcf.SERVER_TIMESTAMP,
                    'updatedAt': gcf.SERVER_TIMESTAMP,
                    'last_text_preview': block_text[:120],                      # 미리보기는 별도 필드
                }, merge=True)
            else:
                # google-cloud-firestore가 없다면, 그래도 messages에는 전문이 들어감
                pass
        except Exception as e:
            log(f"[rooms_biz root sync] 실패: {e}")

        return True

    def upload_both(self, room_title: str, vendor_cleaned: str, block_text: str) -> bool:
        _ = self.upload_status(room_title, vendor_cleaned, block_text)
        return self.upload_rooms_biz(vendor_cleaned, block_text)


# ============== 메인 루프 ==============
def main():
    print("[START] 다중 카톡방 스캔 → 마지막 배너 블록(업체 자동 추출) 업로드 x2")
    print(f"[INFO] 정확명: {WHITELIST_TITLES} / 접두어: {WHITELIST_PREFIXES}")

    uploader = Uploader()
    dedup = DeDupCache(DEDUP_CACHE_PATH)

    if RESET_DEDUP_ON_START:
        dedup.reset()
        print("[INFO] dedup_cache reset on start")

    first_pass_done: Dict[int,bool] = {}
    backfilled: Set[str] = set()  # key = f"{room_title}::{vendor}"

    while True:
        rooms = list_target_windows()
        log(f"발견 창 수: {len(rooms)}")
        for i,(hwnd,title,rect) in enumerate(rooms,start=1):
            print(f"  - [{i}] hwnd={hwnd} title='{title}' rect={rect}")

        for hwnd,title,rect in rooms:
            bring_to_front(hwnd)
            is_first = not first_pass_done.get(hwnd, False)

            text = get_text_for_window(rect, first_pass=is_first)
            first_pass_done[hwnd] = True

            print(f"[{title}] · 클립보드 길이: {len(text)} (first_pass={is_first})")

            if len(text) < MIN_TEXT_LEN:
                print(f"[{title}] · (경고) 복사 텍스트가 너무 짧음 → 스킵")
                continue

            res = find_last_banner_block_with_vendor(text)
            if not res:
                print(f"[{title}] · 배너 헤더 또는 업체 추출 실패 → 스킵")
                continue

            _, _, block, vendor_cleaned = res
            block = soft_normalize(block)

            # 디버깅용: 블록 길이
            if DEBUG:
                print(f"[{title}] · [{vendor_cleaned}] block_len={len(block)}")

            key = f"{title}::{vendor_cleaned}"

            # 변경 없음 → 기본은 스킵, 단 rooms_biz 백필 1회 수행
            if not dedup.is_new(title, vendor_cleaned, block):
                print(f"[{title}] · [{vendor_cleaned}] 마지막 배너 블록 변화 없음 → 스킵")
                if BACKFILL_ROOMS_BIZ_IF_DEDUP and key not in backfilled:
                    ok_rb = uploader.upload_rooms_biz(vendor_cleaned, block)
                    if ok_rb:
                        backfilled.add(key)
                        print(f"[{title}] · [{vendor_cleaned}] rooms_biz 백필 완료(전문)")
                    else:
                        print(f"[{title}] · [{vendor_cleaned}] rooms_biz 백필 실패/미연결")
                continue

            preview = block[:200].replace("\n","\\n")
            print(f"[{title}] · [{vendor_cleaned}] 업로드 미리보기: {preview}")

            ok = uploader.upload_both(title, vendor_cleaned, block)
            if ok:
                print(f"[{title}] · [{vendor_cleaned}] 업로드 OK(status_board + rooms_biz)")
                dedup.update(title, vendor_cleaned, block)
                backfilled.add(key)
            else:
                print(f"[{title}] · [{vendor_cleaned}] 업로드 실패 또는 Firestore 미연결 → dedup 미갱신")

        time.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    main()

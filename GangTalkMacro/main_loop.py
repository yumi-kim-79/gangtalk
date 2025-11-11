# main_loop.py — "지정된 채팅방 안에서만" 캡처/복사 → 텍스트 추출 → (선택) 업로드
import os
import sys
import json
import time
import ctypes
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import win32con
import win32gui
import win32api
import win32clipboard

from pywinauto import Desktop
from PIL import ImageGrab, Image, ImageOps, ImageFilter
import pytesseract

# (선택) Firestore 업로드 사용 시
try:
    import firestore_client  # 사용자가 제공한 파일
except Exception:
    firestore_client = None

CFG_PATH = r"C:\GangTalkMacro\config.json"

# WinAPI 준비
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# 고해상도 DPI 인식
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # Per-Monitor V2
except Exception:
    try:
        user32.SetProcessDPIAware()
    except Exception:
        pass


# ---------- 유틸 ----------
def load_cfg() -> Dict[str, Any]:
    with open(CFG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_window_rect_by_title(title_key: str, exact: bool = False) -> Optional[Tuple[int, int, int, int]]:
    """
    제목(부분/정확)으로 최상단 창을 찾아 사각형(L,T,R,B)을 반환.
    """
    desk = Desktop(backend="uia")
    wins = desk.windows(visible_only=True)
    candidates = []
    for w in wins:
        try:
            t = (w.window_text() or "").strip()
        except Exception:
            t = ""
        if not t:
            continue
        if exact:
            if t == title_key:
                candidates.append((w, t))
        else:
            if title_key in t:
                candidates.append((w, t))
    if not candidates:
        return None
    # 첫 번째 후보 사용
    w, t = candidates[0]
    r = w.rectangle()
    return (r.left, r.top, r.right, r.bottom)

def bring_window_to_front_by_rect(rect: Tuple[int,int,int,int]) -> None:
    """
    사각형으로 창 핸들을 찾아 포커스를 줌(가능한 한).
    """
    L, T, R, B = rect
    hwnd = win32gui.WindowFromPoint((L + 10, T + 10))
    if hwnd:
        try:
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.SetForegroundWindow(hwnd)
        except Exception:
            pass

def click_and_copy(rect: Tuple[int,int,int,int], click_offset: Tuple[int,int]) -> Optional[str]:
    """
    메시지 영역 클릭 → Ctrl+A → Ctrl+C → 클립보드 텍스트 반환.
    실패 시 None.
    """
    L, T, R, B = rect
    x = L + click_offset[0]
    y = T + click_offset[1]

    # 마우스 이동/클릭
    win32api.SetCursorPos((x, y))
    time.sleep(0.03)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.02)
    win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    time.sleep(0.05)

    # Ctrl+A, Ctrl+C
    _key_down(win32con.VK_CONTROL); _key_press(ord('A')); _key_up(win32con.VK_CONTROL)
    time.sleep(0.05)
    _key_down(win32con.VK_CONTROL); _key_press(ord('C')); _key_up(win32con.VK_CONTROL)
    time.sleep(0.08)

    # 클립보드 텍스트 읽기
    try:
        win32clipboard.OpenClipboard()
        data = None
        if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
            data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
        win32clipboard.CloseClipboard()
        if data:
            return data
    except Exception:
        try:
            win32clipboard.CloseClipboard()
        except Exception:
            pass
    return None

def _key_down(vk: int):
    win32api.keybd_event(vk, 0, 0, 0)

def _key_up(vk: int):
    win32api.keybd_event(vk, 0, win32con.KEYEVENTF_KEYUP, 0)

def _key_press(vk: int, gap: float = 0.01):
    _key_down(vk); time.sleep(gap); _key_up(vk)

def ocr_from_window(cfg: Dict[str, Any], rect: Tuple[int,int,int,int], crop_rel: Optional[Tuple[int,int,int,int]]) -> str:
    """
    창 사각형(L,T,R,B) 안에서만 스샷 → OCR.
    crop_rel 있으면 그 구간만 (창 내부 상대좌표 기준).
    """
    L, T, R, B = rect
    if crop_rel:
        x, y, w, h = crop_rel
        bbox = (L + x, T + y, L + x + w, T + y + h)
    else:
        # 전체창에서 여백(margin)만 제외
        mg = int(cfg.get("capture_margin", 16))
        bbox = (L + mg, T + mg, R - mg, B - mg)

    # === 화면 전체가 아닌, 해당 bbox 만 캡처 ===
    img = ImageGrab.grab(bbox=bbox)

    # 전처리
    gray = ImageOps.grayscale(img)
    # 해상도 보정(약간 업스케일)
    scale = 1.25
    w2 = int(gray.width * scale)
    h2 = int(gray.height * scale)
    gray = gray.resize((w2, h2), Image.LANCZOS)
    # 노이즈 완화
    gray = gray.filter(ImageFilter.MedianFilter(size=3))

    # Tesseract 설정
    tess_path = cfg.get("tesseract_path")
    tessdata_dir = cfg.get("tessdata_dir")
    if tess_path:
        pytesseract.pytesseract.tesseract_cmd = tess_path
    tconf = f'--oem {cfg.get("ocr_oem", 3)} --psm {cfg.get("ocr_psm", 6)}'
    if tessdata_dir:
        tconf += f' --tessdata-dir "{tessdata_dir}"'

    lang = cfg.get("ocr_lang", "kor+eng")
    text = pytesseract.image_to_string(gray, lang=lang, config=tconf)
    return text.strip()


def passes_filters(cfg: Dict[str, Any], text: str) -> bool:
    filt = cfg.get("filters", {})
    min_chars = int(filt.get("min_chars", 0) or 0)
    if len((text or "").strip()) < min_chars:
        return False
    needles: List[str] = filt.get("must_include_any", []) or []
    if needles:
        t = text.strip()
        ok = any(n in t for n in needles)
        if not ok:
            return False
    return True

# ---------- 메인 루프 ----------
def main():
    cfg = load_cfg()
    poll_ms = int(cfg.get("poll_interval_ms", 2500))

    # (선택) Firestore
    db = None
    if firestore_client is not None:
        try:
            db = firestore_client.init_firestore()
        except Exception:
            db = None

    windows: List[Dict[str, Any]] = cfg.get("windows", [])

    print("[START] 채팅방별 처리 (제목 일치하는 창 + 해당 창 내부만 캡처)")
    while True:
        cycle_start = time.time()

        for wcfg in windows:
            title_key = (wcfg.get("title") or "").strip()
            if not title_key:
                continue
            exact = bool(wcfg.get("exact_title", False))
            rect = get_window_rect_by_title(title_key, exact=exact)
            if not rect:
                # 해당 채팅방 창이 떠있지 않음
                continue

            bring_window_to_front_by_rect(rect)

            text = None
            # 1) UIA 복사 우선
            if cfg.get("prefer_uia_copy", True):
                click_off = wcfg.get("click_offset") or [260, 120]
                try:
                    text = click_and_copy(rect, (int(click_off[0]), int(click_off[1])))
                except Exception:
                    text = None

            # 2) OCR 폴백 (UIA 복사가 실패했거나 빈 내용인 경우)
            if not text or len(text.strip()) == 0:
                crop_rel = None
                if isinstance(wcfg.get("capture_crop"), (list, tuple)) and len(wcfg["capture_crop"]) == 4:
                    cx, cy, cw, ch = wcfg["capture_crop"]
                    crop_rel = (int(cx), int(cy), int(cw), int(ch))
                text = ocr_from_window(cfg, rect, crop_rel)

            if not text:
                continue

            if not passes_filters(cfg, text):
                continue

            # (선택) Firestore 업로드 — 기존 모듈과 동일하게 사용
            try:
                if db is not None:
                    # status_board 업로드
                    if cfg.get("post_to", {}).get("status_board", True):
                        firestore_client.post_status(db, cfg, source_title=title_key, raw_text=text, vendor="0")

                    # rooms_biz 업로드 (config의 stores와 매칭)
                    if cfg.get("post_to", {}).get("chat", True):
                        stores = cfg.get("stores", []) or []
                        for st in stores:
                            aliases = [st.get("name","")] + (st.get("aliases") or [])
                            if any(a and (a in title_key) for a in aliases):
                                rb_id = st.get("room_biz_id")
                                if rb_id:
                                    firestore_client.post_rooms_biz_message(
                                        db,
                                        room_biz_id=rb_id,
                                        text=text,
                                        author_email=cfg.get("uploader", {}).get("email", "gangtalk815@gmail.com"),
                                        author_uid=cfg.get("uploader", {}).get("uid", "serviceAccount"),
                                    )
                                    firestore_client.touch_rooms_biz_root(db, room_biz_id=rb_id, last_text_preview=text[:120])
            except Exception as e:
                print("[WARN] 업로드 실패:", e)

        # 폴링 간격
        elapsed = time.time() - cycle_start
        sleep_s = max(0.01, poll_ms/1000 - elapsed)
        time.sleep(sleep_s)


if __name__ == "__main__":
    main()

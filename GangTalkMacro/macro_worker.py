# -*- coding: utf-8 -*-
import os, sys, time, json, hashlib, sqlite3, re, threading, traceback
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from PIL import Image, ImageOps, ImageFilter
from mss import mss
from pywinauto import Desktop, mouse
from pywinauto.keyboard import send_keys
from pywinauto.controls.uiawrapper import UIAWrapper
import pytesseract
import pyperclip

import firebase_admin
from firebase_admin import credentials, firestore

# ---------- 콘솔/UTF-8 ----------
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# ---------- 경로 유틸 ----------
def BASE_DIR():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE = BASE_DIR()
def pjoin(*a): return os.path.join(BASE, *a)

def load_json(name, default=None):
    try:
        with open(pjoin(name), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

cfg: Dict[str, Any] = load_json("config.json", {}) or {}
VENDOR_RAW: Dict[str, Any] = load_json("vendor_map.json", {}) or {}

# ---------- 설정 ----------
pytesseract.pytesseract.tesseract_cmd = cfg.get("tesseract_path", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
tessdata_dir = cfg.get("tessdata_dir")
if tessdata_dir:
    os.environ["TESSDATA_PREFIX"] = tessdata_dir

OCR_LANG     = cfg.get("ocr_lang", "kor+eng")
OCR_PSM      = int(cfg.get("ocr_psm", 6))
OCR_OEM      = int(cfg.get("ocr_oem", 3))
POLL_MS      = int(cfg.get("poll_interval_ms", 2500))
MARGIN       = int(cfg.get("capture_margin", 12))
WATCH_TITLES: List[str] = cfg.get("windows", [])
FILTERS      = cfg.get("filters", {})
MUST_INCLUDE_ANY = FILTERS.get("must_include_any", [])
MIN_CHARS        = int(FILTERS.get("min_chars", 0))
DEBUG            = bool(cfg.get("debug", False))
SMOKE_TEST       = bool(cfg.get("smoke_test", False))

# 스로틀(간격) — 내용 동일할 때만 적용 (초). 0 이면 비활성화
COPY_INTERVAL_SEC = int(cfg.get("copy_interval_sec", 300))

# 본문/제목 일치 강제
STRICT_VENDOR_MATCH = bool(cfg.get("strict_vendor_match", True))

# 채팅 캡처
CHAT_CFG  = (cfg.get("chat_capture") or {})
CHAT_MODE = (CHAT_CFG.get("mode") or "clipboard_prefer").lower()
PAD       = CHAT_CFG.get("padding") or {}
PAD_L = int(PAD.get("left",   8))
PAD_T = int(PAD.get("top",   40))
PAD_R = int(PAD.get("right",  8))
PAD_B = int(PAD.get("bottom",12))

OCRCFG     = CHAT_CFG.get("ocr") or {}
OCR_PSM    = int(OCRCFG.get("psm", OCR_PSM))
OCR_OEM    = int(OCRCFG.get("oem", OCR_OEM))
OCR_SCALE  = int(OCRCFG.get("scale", 2))
OCR_BINARY = bool(OCRCFG.get("binary", True))

# OCR 하단만 사용할지
OCR_BOTTOM_ONLY = bool(cfg.get("ocr_bottom_only", False))
# 헤더(업체명 포함) 라인부터 끝까지 자르기
BLOCK_FROM_HEADER = bool(cfg.get("block_from_header", True))
# 헤더 못 찾으면 전체 사용
READ_FULL_MESSAGE = bool(cfg.get("read_full_message", True))

fs_cfg = cfg.get("firestore", {}) or {}
ROOT_VENDOR_COL = fs_cfg.get("biz_collection", "rooms_biz")
STATUS_SUBCOL   = fs_cfg.get("status_collection", "status_board")
STATUS_DOCID    = "latest"
ROOMS_SUBCOL    = fs_cfg.get("rooms_subcollection", "rooms")
MSGS_SUBCOL     = fs_cfg.get("message_subcollection", "messages")
AUTO_CREATE_ROOM = bool(fs_cfg.get("autoCreateBizRoom", True))

POST_TO_CHAT  = bool(cfg.get("post_to",{}).get("chat", True))
POST_TO_STAT  = bool(cfg.get("post_to",{}).get("status_board", True))

STORES = cfg.get("stores") or []

# ---------- Firebase ----------
def fatal(msg):
    print(msg, flush=True)
    try:
        with open(pjoin("macro.log"), "a", encoding="utf-8") as f:
            f.write("[FATAL] " + msg + "\n")
    except Exception:
        pass
    sys.exit(1)

cred_path = pjoin("serviceAccountKey.json")
if not os.path.exists(cred_path):
    fatal("serviceAccountKey.json 파일이 없습니다. 같은 폴더에 두세요.")

try:
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    fatal(f"Firebase 초기화 실패: {e}")

# ---------- 시간대 ----------
KST = timezone(timedelta(hours=9))

# ---------- 중복 방지 DB ----------
SEEN_DB = pjoin("seen.db")
conn = sqlite3.connect(SEEN_DB, check_same_thread=False)
cur = conn.cursor()
cur.execute("""CREATE TABLE IF NOT EXISTS seen (id TEXT PRIMARY KEY, ts INTEGER)""")
conn.commit()

def seen_add(h):
    try:
        cur.execute("INSERT INTO seen (id, ts) VALUES (?,?)", (h, int(time.time())))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False

def has_seen(h):
    cur.execute("SELECT 1 FROM seen WHERE id=?", (h,))
    return cur.fetchone() is not None

def to_hash(s):
    return hashlib.sha1(s.encode("utf-8", errors="ignore")).hexdigest()

def log(msg):
    stamp = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {msg}"
    print(line, flush=True)
    try:
        with open(pjoin("macro.log"), "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ---------- 벤더 매핑 (bizId 지원) ----------
def _norm_key(s: str) -> str:
    if not s: return ""
    s = re.sub(r"\s+", "", s)
    s = s.replace(".", "").replace("&", "AND")
    s = re.sub(r"[^0-9A-Za-z가-힣]", "", s)
    return s.upper()

ALIAS_MAP: Dict[str, Dict[str, Any]] = {}
WINDOW_TITLE_MAP: Dict[str, Dict[str, Any]] = {}
ALL_ALIASES: Dict[str, set] = {}

# vendor_map.json 우선, config.stores는 보조(fallback)
def _store_biz_by_vendor(vendorId: str) -> str:
    for s in STORES:
        try:
            if s.get("vendorId") == vendorId and s.get("room_biz_id"):
                return s.get("room_biz_id")
        except Exception:
            continue
    return None

for k, v in (VENDOR_RAW or {}).items():
    if not isinstance(v, dict):
        continue
    vendor_id = v.get("vendorId")
    # vendor_map의 bizDocId 우선, 없으면 config.stores의 room_biz_id, 둘 다 없으면 vendorId
    biz_id = v.get("bizDocId") or _store_biz_by_vendor(vendor_id) or vendor_id
    base = {
        "vendorId": vendor_id,
        "bizId": biz_id,
        "roomId": v.get("roomId")
    }
    ALIAS_MAP[_norm_key(k)] = base
    ALL_ALIASES.setdefault(vendor_id, set()).add(k)
    for a in v.get("aliases", []):
        ALIAS_MAP[_norm_key(a)] = base
        ALL_ALIASES.setdefault(vendor_id, set()).add(a)
    for t in v.get("windowTitles", []):
        WINDOW_TITLE_MAP[_norm_key(t)] = base

# ---------- 텍스트 블록 추출 ----------
def _normalize_for_match(s: str) -> str:
    if not s: return ""
    s = s.replace("&", "AND")
    s = re.sub(r"[\s\.\-\_\[\]\(\)💰🥃⭐✨·•—\-~]+", "", s)
    return s.upper()

def crop_from_last_vendor_header(full_text: str) -> str:
    t = (full_text or "").strip()
    if not t:
        return ""

    lines = full_text.splitlines()
    norm_lines = [_normalize_for_match(x) for x in lines]

    all_alias_norm = set()
    for aliases in ALL_ALIASES.values():
        for a in aliases:
            all_alias_norm.add(_normalize_for_match(a))

    header_idx = -1
    for i in range(len(lines)-1, -1, -1):
        ln = lines[i].strip()
        if not (6 <= len(ln) <= 80):
            continue
        n = norm_lines[i]
        for a in all_alias_norm:
            if a and a in n:
                header_idx = i
                break
        if header_idx >= 0:
            break

    if header_idx >= 0:
        return "\n".join(l.strip() for l in lines[header_idx:] if l.strip())

    paras = [p.strip() for p in re.split(r"\n{2,}", t) if p.strip()]
    if paras:
        return paras[-1]

    tail = [ln.strip() for ln in lines if ln.strip()]
    return "\n".join(tail[-80:])

# ---------- 파싱 ----------
def normalize_vendor(raw):
    if not raw: return ""
    return re.sub(r"[^\w가-힣A-Za-z0-9]+", "", raw)

def extract_vendor(first_line, top_lines):
    probe = " ".join(top_lines[:5])
    for t in re.findall(r"[가-힣A-Za-z0-9&\.]+", probe):
        if _norm_key(t) in ALIAS_MAP:
            return normalize_vendor(t)
    if not first_line: return ""
    cleaned = re.sub(r"[^가-힣A-Za-z0-9\.\s&]", " ", first_line)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    parts = [x for x in re.split(r"\s+", cleaned) if x]
    if parts:
        parts.sort(key=lambda s: (len(re.sub(r"[^가-힣]", "", s)), len(s)), reverse=True)
        cand = parts[0]
    else:
        cand = cleaned
    return normalize_vendor(cand)

def parse_template(full_text):
    lines = [re.sub(r"\s+$", "", l) for l in full_text.splitlines() if l.strip()]
    first = lines[0] if lines else ""
    vendor_norm = extract_vendor(first, lines)

    date_pat = re.compile(r"(\d{1,2}\s*월|\d{4}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})", re.I)
    addr_pat = re.compile(r"(구|동|로|길|리)\s*\d", re.I)
    date = ""; addr = ""
    for l in lines[:5]:
        if not date and date_pat.search(l): date = l.strip()
        if not addr and addr_pat.search(l): addr = l.strip()

    return {
        "vendorKey": vendor_norm,
        "vendorRaw": first.strip(),
        "dateLine": date,
        "addrLine": addr,
        "raw": "\n".join(lines).strip()
    }

def route_to_vendor(parsed, win_title: str):
    if win_title:
        nk = _norm_key(win_title)
        for k in WINDOW_TITLE_MAP:
            if k in nk:
                return WINDOW_TITLE_MAP[k]
    key = parsed.get("vendorKey", "")
    if key:
        v = ALIAS_MAP.get(_norm_key(key))
        if v: return v
    raw = parsed.get("vendorRaw", "")
    for t in re.findall(r"[가-힣A-Za-z0-9&\.]+", raw):
        v = ALIAS_MAP.get(_norm_key(t))
        if v: return v
    return None

# ---------- 창/영역 탐색 ----------
def _get_title(w):
    t = ""
    try:
        t = (w.window_text() or "").strip()
    except Exception:
        t = ""
    if not t:
        try:
            t = (getattr(w, "element_info", None).name or "").strip()
        except Exception:
            pass
    return t

def find_windows():
    wanted = list({*(WATCH_TITLES or []), "카카오톡", "KakaoTalk", "오픈채팅"})
    wins_all = []
    for backend in ("uia", "win32"):
        try:
            desk = Desktop(backend=backend)
            for w in desk.windows():
                t = _get_title(w)
                if not t: continue
                if any(k for k in wanted if k in t):
                    wins_all.append((backend, w, t))
        except Exception:
            continue
    uniq = {}
    for backend, w, t in wins_all:
        handle = getattr(w, "handle", id(w))
        if handle not in uniq:
            uniq[handle] = (backend, w, t)
    wins = [v[1] for v in uniq.values()]
    if DEBUG:
        titles = [v[2] for v in uniq.values()]
        log(f"[FIND] matched={len(wins)} | titles={titles}")
    return wins

def dump_all_window_titles():
    try:
        for backend in ("uia", "win32"):
            titles = []
            try:
                desk = Desktop(backend=backend)
                for w in desk.windows():
                    t = _get_title(w)
                    if t: titles.append(t)
            except Exception:
                pass
            if len(titles) > 40:
                titles = titles[:40] + ["...(+more)"]
            log(f"[DUMP:{backend}] {len(titles)} titles = {titles}")
    except Exception as e:
        log(f"[DUMP:ERR] {e}")

def _largest_rect(children):
    best, area = None, -1
    for c in children:
        try:
            r = c.rectangle()
            a = max(0, r.right - r.left) * max(0, r.bottom - r.top)
            if a > area:
                area, best = a, r
        except Exception:
            pass
    return best

def chat_rect(win):
    try:
        w = UIAWrapper(win.element_info)
        candidates = []
        for ct in ("List", "Pane", "Document"):
            candidates.extend(w.descendants(control_type=ct))
        target = _largest_rect(candidates)
        if target:
            l, t, r, b = target.left, target.top, target.right, target.bottom
        else:
            rr = win.rectangle(); l, t, r, b = rr.left, rr.top, rr.right, rr.bottom
    except Exception:
        rr = win.rectangle(); l, t, r, b = rr.left, rr.top, rr.right, rr.bottom
    l += PAD_L; t += PAD_T; r -= PAD_R; b -= PAD_B
    return (max(0, l), max(0, t), max(r, l+10), max(b, t+10))

# ---------- 캡처/전처리 ----------
def preprocess(im: Image.Image) -> Image.Image:
    if OCR_SCALE and OCR_SCALE > 1:
        im = im.resize((im.width * OCR_SCALE, im.height * OCR_SCALE), Image.BICUBIC)
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g)
    if OCR_BINARY:
        g = g.point(lambda x: 255 if x > 180 else 0, mode='1').convert('L')
    g = g.filter(ImageFilter.SHARPEN)
    return g

def capture_ocr_text(rect, win_title=""):
    left, top, right, bottom = rect
    if OCR_BOTTOM_ONLY:
        height = bottom - top
        top = top + int(height * 0.65)  # 하단 35%만
    mon = {
        "left":   max(0, left),
        "top":    max(0, top),
        "width":  max(10, right - left),
        "height": max(10, bottom - top)
    }
    with mss() as sct:
        img = sct.grab(mon)
        im = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
    pim = preprocess(im)
    text = pytesseract.image_to_string(
        pim, lang=OCR_LANG,
        config=f"--oem {OCR_OEM} --psm {OCR_PSM}"
    )
    if DEBUG:
        dbg = pjoin("debug"); os.makedirs(dbg, exist_ok=True)
        ts = datetime.now(KST).strftime("%Y%m%d_%H%M%S_%f")
        base = re.sub(r"[^\w가-힣]", "_", (win_title or "win"))
        try:
            pim.save(pjoin(dbg, f"{base}_{ts}.png"))
            with open(pjoin(dbg, f"{base}_{ts}.txt"), "w", encoding="utf-8") as f:
                f.write(text or "")
        except Exception:
            pass
    return (text or "").strip()

def capture_uia_text(win):
    try:
        w = UIAWrapper(win.element_info)
        parts = []
        for ct in ("Text", "Edit", "Document"):
            for n in w.descendants(control_type=ct):
                try:
                    s = (n.window_text() or "").strip()
                    if s and len(s) >= 2:
                        parts.append(s)
                except Exception:
                    pass
        txt = "\n".join(parts).strip()
        return txt
    except Exception:
        return ""

def capture_clipboard_text(win, rect):
    cx = rect[0] + 20; cy = rect[1] + 20
    try:
        _ = pyperclip.paste()
    except Exception:
        pass
    try:
        win.set_focus()
    except Exception:
        pass
    try:
        mouse.click(button='left', coords=(cx, cy))
        time.sleep(0.05)
        send_keys('^a')
        time.sleep(0.05)
        send_keys('^c')
        time.sleep(0.15)
        text = (pyperclip.paste() or "").strip()
        return text
    except Exception:
        return ""

def quick_filter(t):
    t = (t or "").strip()
    if len(t) < MIN_CHARS: return False
    if MUST_INCLUDE_ANY and not any(k in t for k in MUST_INCLUDE_ANY): return False
    return True

# ---------- Firestore (bizId 사용 + 자동 방 생성) ----------
def ensure_biz_doc(bizId, vendorNameRaw=""):
    """상단 /rooms_biz/{bizId} 업서트"""
    try:
        doc_ref = db.collection(ROOT_VENDOR_COL).document(bizId)
        doc_ref.set({
            "rooms_biz": bizId,
            "title": vendorNameRaw or firestore.DELETE_FIELD,
            "active": True,
            "totalRooms": firestore.DELETE_FIELD,
            "totalNeeded": firestore.DELETE_FIELD,
            "totalCurrent": firestore.DELETE_FIELD,
            "totalRemaining": firestore.DELETE_FIELD,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "createdAt": firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception as e:
        log(f"ERR ensure_biz_doc: {e}")
        raise

def ensure_room_doc(bizId, roomId):
    """/rooms_biz/{bizId}/rooms/{roomId} 업서트 (필요시 최초 1회 생성)"""
    try:
        if not AUTO_CREATE_ROOM:
            return
        room_ref = db.collection(ROOT_VENDOR_COL).document(bizId) \
                     .collection(ROOMS_SUBCOL).document(str(roomId))
        room_ref.set({
            "roomId": str(roomId),
            "active": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception as e:
        log(f"ERR ensure_room_doc: {e}")
        raise

def post_to_status(bizId, parsed):
    ensure_biz_doc(bizId, parsed.get("vendorRaw",""))
    doc_ref = db.collection(ROOT_VENDOR_COL).document(bizId) \
                .collection(STATUS_SUBCOL).document(STATUS_DOCID)
    doc_ref.set({
        "vendorNameRaw": parsed["vendorRaw"],
        "dateLine": parsed["dateLine"],
        "addrLine": parsed["addrLine"],
        "raw": parsed["raw"],
        "updatedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)

def post_to_chat(bizId, roomId, parsed):
    ensure_biz_doc(bizId, parsed.get("vendorRaw",""))
    ensure_room_doc(bizId, roomId)
    col = db.collection(ROOT_VENDOR_COL).document(bizId) \
            .collection(ROOMS_SUBCOL).document(str(roomId)) \
            .collection(MSGS_SUBCOL)
    col.add({
        "text": parsed["raw"],
        "author": "매크로",
        "type": "text",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    })

# ---------- 스로틀(내용 인지형) ----------
LAST_POST: Dict[str, Dict[str, Any]] = {}  # bizId -> {"ts": float, "hash": str}

def throttle_allow(key: str, content_hash: str) -> (bool, float):
    """
    True = 업로드 허용, False = 스킵(남은초)
    - 내용이 달라지면 간격 무시하고 즉시 허용
    - 내용이 같으면 COPY_INTERVAL_SEC 만큼 제한
    - COPY_INTERVAL_SEC == 0 이면 항상 허용
    """
    if COPY_INTERVAL_SEC <= 0:
        return True, 0.0
    rec = LAST_POST.get(key)
    now = time.time()
    if not rec:
        return True, 0.0
    if rec.get("hash") != content_hash:
        return True, 0.0
    remain = rec.get("ts", 0.0) + COPY_INTERVAL_SEC - now
    if remain > 0:
        return False, remain
    return True, 0.0

def mark_posted(key: str, content_hash: str):
    LAST_POST[key] = {"ts": time.time(), "hash": content_hash}

# ---------- 워커 ----------
class MacroWorker:
    def __init__(self):
        self._th = None
        self._stop = threading.Event()
        self._pause = threading.Event()

    def start(self):
        if self._th and self._th.is_alive(): return
        self._stop.clear(); self._pause.clear()
        self._th = threading.Thread(target=self._run, daemon=True)
        self._th.start()
        log("▶ 매크로 시작")

    def stop(self):
        self._stop.set()
        if self._th: self._th.join(timeout=2)
        log("■ 매크로 종료")

    def pause(self, on=True):
        if on:
            self._pause.set(); log("⏸ 일시정지")
        else:
            self._pause.clear(); log("▶ 재개")

    def _run(self):
        log(f"내용 동일 시 간격 제한(COPY_INTERVAL_SEC) = {COPY_INTERVAL_SEC}s")
        while not self._stop.is_set():
            try:
                if self._pause.is_set():
                    time.sleep(0.5); continue

                wins = find_windows()
                log(f"[HB] 감시창 수 = {len(wins)}")
                if not wins:
                    dump_all_window_titles()
                    time.sleep(POLL_MS/1000.0); continue

                for w in wins:
                    title = _get_title(w)
                    log(f"[WIN] '{title or '(제목없음)'}' 창 처리 시작")
                    rect  = chat_rect(w)

                    txt_all = ""
                    if CHAT_MODE == "clipboard_prefer":
                        txt_all = capture_clipboard_text(w, rect)
                        if not quick_filter(txt_all):
                            txt_all = capture_uia_text(w)
                        if not quick_filter(txt_all):
                            txt_all = capture_ocr_text(rect, title)
                    elif CHAT_MODE == "uia_prefer":
                        txt_all = capture_uia_text(w)
                        if not quick_filter(txt_all):
                            txt_all = capture_ocr_text(rect, title)
                    else:
                        txt_all = capture_ocr_text(rect, title)

                    if not quick_filter(txt_all):
                        continue

                    use_text = crop_from_last_vendor_header(txt_all) if BLOCK_FROM_HEADER else txt_all
                    if not use_text and READ_FULL_MESSAGE:
                        use_text = txt_all

                    t_norm = re.sub(r"[\u200b\u200c\u200d]+", "", use_text or "").strip()
                    parsed = parse_template(t_norm)

                    log(f"[CAP] 창제목='{title}' | 1행='{parsed.get('vendorRaw','')}' | vendorKey='{parsed.get('vendorKey','')}'")

                    route = route_to_vendor(parsed, title)
                    if not route:
                        log(f"⚠ 미매핑 업체: key='{parsed.get('vendorKey','')}', title='{title}'")
                        continue

                    vendorId = route.get("vendorId")
                    bizId    = route.get("bizId") or vendorId
                    roomId   = route.get("roomId")
                    if not vendorId or not bizId:
                        log("⚠ vendorId/bizId 누락 in vendor_map.json")
                        continue

                    # 제목-본문 일치 강제(벤더 기준)
                    if STRICT_VENDOR_MATCH:
                        title_vendor = None
                        for k, v in WINDOW_TITLE_MAP.items():
                            if k in _norm_key(title):
                                title_vendor = v.get("vendorId"); break
                        body_vendor = vendorId
                        if title_vendor and body_vendor and title_vendor != body_vendor:
                            log(f"⛔ 제목/본문 불일치 → title_vendor={title_vendor}, body_vendor={body_vendor}. 스킵.")
                            continue

                    # 해시 계산 (bizId 기준)
                    content_hash = to_hash((bizId or "") + "\n" + parsed["raw"])

                    # 같은 내용이면 간격 제한 적용, 새 내용이면 즉시 허용
                    ok, remain = throttle_allow(bizId, content_hash)
                    if not ok:
                        log(f"⏱ 동일내용 간격 제한으로 스킵 → biz={bizId}, 남은 {int(remain)}초")
                        continue

                    # 전역 seen DB도 중복 방지 (재시작 대응)
                    if has_seen(content_hash):
                        log(f"↩ 이미 업로드된 동일 내용(재방지) → biz={bizId}")
                        continue
                    if not seen_add(content_hash):
                        continue

                    # 업로드
                    if POST_TO_STAT:
                        post_to_status(bizId, parsed)
                    if POST_TO_CHAT and roomId:
                        post_to_chat(bizId, roomId, parsed)

                    mark_posted(bizId, content_hash)
                    log(f"✅ 반영 완료 → biz={bizId} / vendor={vendorId} / room={roomId or '-'}")

                time.sleep(POLL_MS/1000.0)

            except Exception:
                log("ERR:\n" + traceback.format_exc())
                time.sleep(1.5)

# ---------- 스모크 테스트 ----------
def smoke_test():
    try:
        parsed = {
            "vendorRaw": "유앤미",
            "dateLine": datetime.now(KST).strftime("%Y-%m-%d"),
            "addrLine": "테스트 주소",
            "raw": "[SMOKE] 연결 테스트 업로드 " + datetime.now(KST).isoformat()
        }
        bizId = "youandme"   # vendorId==bizId 환경에서도 동작
        ensure_biz_doc(bizId, parsed["vendorRaw"])
        post_to_status(bizId, parsed)
        log("🌬  Smoke test: status_board/latest 쓰기 OK")
        return True
    except Exception as e:
        log(f"Smoke test 실패: {e}")
        return False

# ---------- 엔트리 ----------
if __name__ == "__main__":
    log("프로그램 시작")
    if SMOKE_TEST:
        smoke_test()
    worker = MacroWorker()
    worker.start()
    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        worker.stop()

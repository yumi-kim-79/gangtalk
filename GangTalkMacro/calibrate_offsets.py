# calibrate_offsets.py — 채팅/붙여넣기 좌표 & 캡처영역을 마우스로 지정해서 config.json에 저장
import json
import time
import ctypes
from pathlib import Path
from typing import Tuple, Optional, Dict, Any, List

from pywinauto import Desktop

# ===== 설정 파일 경로 =====
CFG_PATH = r"C:\GangTalkMacro\config.json"

# ===== 마우스 좌표 읽기 (WinAPI) =====
POINT = ctypes.wintypes.POINT
user32 = ctypes.windll.user32

def get_cursor_pos() -> Tuple[int, int]:
    """현재 마우스 커서의 화면 좌표(x,y)"""
    p = POINT()
    user32.GetCursorPos(ctypes.byref(p))
    return p.x, p.y

def press_enter(msg: str):
    """Enter 대기 프롬프트"""
    input(msg + "  (Enter)")

def pick_window(backend: str = "uia") -> Optional[Dict[str, Any]]:
    """
    현재 보이는 창 목록을 나열하고 하나를 선택받아,
    그 창의 실제 제목과 화면 절대 좌표 사각형을 반환.
    반환 예: {"title": "...", "rect": (L,T,R,B)}
    """
    desk = Desktop(backend=backend)
    try:
        wins = desk.windows(visible_only=True)
    except Exception:
        print("[ERR] 화면 창 목록을 가져오는 데 실패했습니다.")
        return None

    titles: List[Tuple[Any, str]] = []
    for w in wins:
        try:
            t = w.window_text() or ""
        except Exception:
            t = ""
        if t.strip():
            titles.append((w, t.strip()))

    if not titles:
        print("[ERR] 보이는 창이 없습니다.")
        return None

    print("\n=== 보이는 창 ===")
    for i, (_, t) in enumerate(titles, 1):
        print(f"{i:2d}) {t}")

    try:
        raw = input("\n번호 입력(취소는 빈칸): ").strip()
        if not raw:
            return None
        idx = int(raw)
    except ValueError:
        return None

    if not (1 <= idx <= len(titles)):
        return None

    w, t = titles[idx-1]
    r = w.rectangle()
    rect = (r.left, r.top, r.right, r.bottom)
    return {"title": t, "rect": rect}

def ensure_cfg() -> Dict[str, Any]:
    """
    config.json을 읽어오거나, 없으면 기본 스켈레톤을 만들어 반환.
    이 스크립트는 windows(복사 소스), paste_targets(붙여넣기 대상)을 채웁니다.
    """
    p = Path(CFG_PATH)
    if p.exists():
        try:
            with p.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            print("[WARN] 기존 config.json 파싱 실패 → 기본값으로 시작합니다.")

    # 기본 config 스켈레톤
    return {
        "windows": [],  # ← 이 스크립트가 {title, click_offset, exact_title, capture_crop?} 형태로 채웁니다.
        "poll_interval_ms": 2500,

        "tesseract_path": r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        "tessdata_dir":   r"C:\GangTalkMacro\tessdata",
        "ocr_lang": "kor+eng",
        "ocr_psm": 6,
        "ocr_oem": 3,
        "ocr_dpi": 300,

        "capture_margin": 16,

        "firestore": {
            "status_collection": "status_board",
            "chat_collection": "rooms",
            "message_subcollection": "messages"
        },

        "post_to": { "chat": True, "status_board": True },

        "filters": {
            "must_include_any": [],
            "min_chars": 10
        },

        # UI 복사 우선 사용
        "prefer_uia_copy": True,

        # 붙여넣기 대상(초톡 등)
        "paste_targets": [],
    }

def save_cfg(cfg: Dict[str, Any]):
    """config.json 저장"""
    Path(CFG_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] 저장됨: {CFG_PATH}")

# =========================
# 여기서부터 핵심: windows 배열을 직접 갱신
# =========================
def _normalize_windows_arr(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    cfg['windows']가 문자열/객체가 섞여 있을 수 있으므로
    모두 객체 형태로 정규화해서 반환.
    객체 형식:
      {
        "title": "<창 제목 부분일치 키>",
        "click_offset": [x, y],              # Ctrl+A/C 수행할 메시지 영역 내 클릭 오프셋(창 좌상단 기준)
        "exact_title": false,                # 부분일치 vs 정확일치(현 구조는 부분일치 사용)
        "capture_crop": [x, y, w, h]?        # 선택: OCR 폴백 시 사용할 크롭(창 내부 상대좌표)
      }
    """
    norm: List[Dict[str, Any]] = []
    raw = cfg.setdefault("windows", [])
    for w in raw:
        if isinstance(w, str):
            norm.append({
                "title": w,
                "click_offset": cfg.get("copy_click_offset", [260, 120]),
                "exact_title": False
            })
        elif isinstance(w, dict):
            item = {
                "title":        w.get("title") or w.get("name") or "",
                "click_offset": w.get("click_offset") or w.get("copy_click_offset") or cfg.get("copy_click_offset", [260,120]),
                "exact_title":  bool(w.get("exact_title", False))
            }
            if isinstance(w.get("capture_crop"), (list, tuple)) and len(w["capture_crop"]) == 4:
                item["capture_crop"] = list(w["capture_crop"])
            norm.append(item)
        else:
            pass
    return norm

def add_or_update_source(
    cfg: Dict[str, Any],
    title_sub: str,
    copy_off: Optional[Tuple[int, int]],
    crop: Optional[Tuple[int, int, int, int]]
):
    """
    - title_sub: 창 제목 '부분일치' 키
    - copy_off : (선택) 메시지 영역 클릭 오프셋 (창 좌상단 기준). None이면 기존값 유지.
    - crop     : (선택) OCR 폴백 크롭 [x,y,w,h] (창 좌상단 기준). None이면 기존값 유지.
    """
    wins = _normalize_windows_arr(cfg)

    found = False
    for w in wins:
        if w.get("title") == title_sub:
            if copy_off is not None:
                w["click_offset"] = list(copy_off)
            if crop is not None:
                w["capture_crop"] = list(crop)
            found = True
            break

    if not found:
        item = {
            "title": title_sub,
            "click_offset": list(copy_off) if copy_off is not None else cfg.get("copy_click_offset", [260,120]),
            "exact_title": False
        }
        if crop is not None:
            item["capture_crop"] = list(crop)
        wins.append(item)

    cfg["windows"] = wins  # ← 덮어쓰기

def add_or_update_target(cfg: Dict[str, Any],
                         title_sub: str,
                         input_off: Tuple[int, int],
                         press_enter: bool = True):
    """
    붙여넣기 대상(초톡 등)을 cfg['paste_targets']에 저장/갱신
    형식:
      {
        "title_contains": "<부분일치 키>",
        "input_click_offset": [x,y],
        "press_enter": true
      }
    """
    tgs: List[Dict[str, Any]] = cfg.setdefault("paste_targets", [])
    updated = False
    for t in tgs:
        if t.get("title_contains") == title_sub:
            t["input_click_offset"] = list(input_off)
            t["press_enter"] = bool(press_enter)
            updated = True
            break

    if not updated:
        tgs.append({
            "title_contains": title_sub,
            "input_click_offset": list(input_off),
            "press_enter": bool(press_enter)
        })

# =========================
# 메인 UI
# =========================
def main():
    cfg = ensure_cfg()

    while True:
        print("\n==== 캘리브레이션 메뉴 ====")
        print(" 1) 소스 채팅창(복사) 좌표 지정")
        print(" 2) 소스 채팅창 캡처영역(크롭) 지정 (선택/OCR 폴백용)")
        print(" 3) 타겟 창(초톡 등) 붙여넣기 좌표 지정")
        print(" 4) 종료(저장)")
        sel = input("선택: ").strip()
        if sel == "4" or sel == "":
            break

        if sel == "1":
            w = pick_window()
            if not w:
                continue
            title = w["title"]
            L, T, R, B = w["rect"]
            print(f"\n[소스창: {title}]")
            print("마우스를 '메시지 영역' 안에 올려두고 Enter를 누르세요.")
            press_enter("대기중…")
            x, y = get_cursor_pos()
            off = (x - L, y - T)
            print(f"→ copy_click_offset = {off}")

            add_or_update_source(cfg, title_sub=title, copy_off=off, crop=None)
            print("[OK] 소스 좌표가 저장 큐에 반영되었습니다.")

        elif sel == "2":
            w = pick_window()
            if not w:
                continue
            title = w["title"]
            L, T, R, B = w["rect"]
            print(f"\n[소스창: {title}]")
            print("① 캡처영역의 '좌상단'에 마우스를 올리고 Enter")
            press_enter("대기중…")
            x1, y1 = get_cursor_pos()
            print("② 캡처영역의 '우하단'에 마우스를 올리고 Enter")
            press_enter("대기중…")
            x2, y2 = get_cursor_pos()

            # 창 좌상단 기준 상대 좌표로 변환
            x_rel = max(0, min(x1, x2) - L)
            y_rel = max(0, min(y1, y2) - T)
            w_rel = max(1, abs(x2 - x1))
            h_rel = max(1, abs(y2 - y1))
            crop = (x_rel, y_rel, w_rel, h_rel)
            print(f"→ capture_crop = {crop}  (창 좌상단 기준)")

            # 기존 click_offset은 유지하고, crop만 갱신
            add_or_update_source(cfg, title_sub=title, copy_off=None, crop=crop)
            print("[OK] 소스 캡처 크롭이 저장 큐에 반영되었습니다.")

        elif sel == "3":
            w = pick_window()
            if not w:
                continue
            title = w["title"]
            L, T, R, B = w["rect"]
            print(f"\n[타겟창: {title}]")
            print("마우스를 '입력창 텍스트박스' 위에 올리고 Enter를 누르세요.")
            press_enter("대기중…")
            x, y = get_cursor_pos()
            off = (x - L, y - T)
            print(f"→ input_click_offset = {off}")

            add_or_update_target(cfg, title_sub=title, input_off=off, press_enter=True)
            print("[OK] 타겟 붙여넣기 좌표가 저장 큐에 반영되었습니다.")

        else:
            print("메뉴를 다시 선택하세요.")

    save_cfg(cfg)
    print("[끝] 좌표/크롭 설정이 저장되었습니다.")

if __name__ == "__main__":
    main()

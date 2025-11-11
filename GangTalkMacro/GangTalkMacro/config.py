# C:\GangTalkMacro\GangTalkMacro\config.py
import json
import os

DEFAULTS = {
    "tesseract_path": r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    "tessdata_dir":   r"C:\GangTalkMacro\tessdata",
    "ocr_lang": "kor+eng",
    "ocr_psm": 6,
    "ocr_oem": 3,
    "ocr_dpi": 300,
    "capture_margin": 12,
    "poll_interval_ms": 2500,
    "post_to": {"chat": True, "status_board": True},
    "filters": {"must_include_any": ["—", "———", "🚫", "💰"], "min_chars": 40},
    "firestore": {
        "status_collection": "status_board",
        "chat_collection": "rooms",
        "message_subcollection": "messages",
    },
}

def load_config(path: str) -> dict:
    # BOM(UTF-8 with BOM)도 허용
    with open(path, "r", encoding="utf-8-sig") as f:
        cfg = json.load(f)

    # 기본값 채우기
    for k, v in DEFAULTS.items():
        if k not in cfg:
            cfg[k] = v

    return cfg

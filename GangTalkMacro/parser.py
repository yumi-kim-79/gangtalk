# GangTalkMacro/parser.py
from __future__ import annotations
import re
from typing import Dict, Any

# 업체명은 "💰💰💰 유.앤.미 💰💰💰" 같은 라인에서 추출
RE_VENDOR = re.compile(r"[💰\s]*([가-힣A-Za-z0-9\.\-&\s]+)[💰\s]*$")
RE_DATE   = re.compile(r"(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*([월화수목금토일]요일)?")
RE_ADDR   = re.compile(r"([가-힣A-Za-z0-9\s\-\.]+?\d[\d\-]*.*)")

RE_FLOOR_SEP = re.compile(r"^-+\s*(\d+)\s*층\s*-+$")
RE_RULE_LINE = re.compile(r"^[—\-]+\s*[ㅁ\.]?[ㄴ\.]?\s*[—\-]+$")  # — ㅁ.ㄴ — 류
RE_BAN_LINE  = re.compile(r"🚫|금지")
RE_MAP_LINE  = re.compile(r"[가-힣A-Za-z0-9\.\-]+?\s*[—\-]\s*[가-힣A-Za-z0-9\.\-\(\)\s]+")

def clean_line(s: str) -> str:
    return re.sub(r"[^\S\r\n]+", " ", s).strip()

def parse_payload(text: str) -> Dict[str, Any]:
    """
    OCR 텍스트를 받아 구조화.
    """
    lines = [clean_line(x) for x in text.splitlines() if clean_line(x)]
    out: Dict[str, Any] = {
        "vendor": None,
        "date": None,
        "address": None,
        "floors": {},      # {'1': [..], '2': [..]}
        "bans": [],
        "rules": [],
        "mapping": [],     # ["권 — 루.나(1) 설.인1.22", ...]
        "raw": text.strip()
    }
    if not lines:
        return out

    # 1) 업체명 라인 후보 (상단에서 이모지 포함 라인)
    for i in range(min(3, len(lines))):
        m = RE_VENDOR.search(lines[i])
        if m:
            cand = m.group(1)
            # 점과 공백만으로 된 이름 정리
            out["vendor"] = re.sub(r"\s{2,}", " ", cand).strip(" .")
            break

    # 2) 날짜/주소
    for i in range(min(6, len(lines))):
        if not out["date"]:
            m = RE_DATE.search(lines[i])
            if m:
                out["date"] = {"month": int(m.group(1)), "day": int(m.group(2)), "dow": m.group(3) or ""}
                continue
        if not out["address"]:
            m2 = RE_ADDR.search(lines[i])
            if m2 and any(k in lines[i] for k in ("구", "동", "로", "길")):
                out["address"] = m2.group(1).strip()

    # 3) 본문 블록 (층/규정/매핑)
    cur_floor = None
    for s in lines:
        if RE_FLOOR_SEP.match(s):
            cur_floor = RE_FLOOR_SEP.match(s).group(1)
            out["floors"].setdefault(cur_floor, [])
            continue
        if RE_RULE_LINE.match(s):
            out["rules"].append(s)
            continue
        if RE_BAN_LINE.search(s):
            out["bans"].append(s)
            continue
        if RE_MAP_LINE.match(s):
            out["mapping"].append(s)
            continue
        if cur_floor:
            # 층 내부 일반 라인
            out["floors"][cur_floor].append(s)

    return out

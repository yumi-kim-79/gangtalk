# GangTalkMacro/kakao_capture.py
from __future__ import annotations
from typing import List, Dict, Tuple
from dataclasses import dataclass

import mss
from pywinauto import Desktop

@dataclass
class WinInfo:
    title: str
    rect: Tuple[int, int, int, int]  # (left, top, right, bottom)

def _rect_tuple(r) -> Tuple[int, int, int, int]:
    return (int(r.left), int(r.top), int(r.right), int(r.bottom))

def _search_by_top_titles(titles: List[str]) -> List[WinInfo]:
    wins: List[WinInfo] = []
    if not titles:
        return wins
    desk = Desktop(backend="uia")
    for t in titles:
        if not t:
            continue
        try:
            w = desk.window(title_re=f".*{t}.*", visible_only=True)
            r = w.rectangle()
            wins.append(WinInfo(title=t, rect=_rect_tuple(r)))
        except Exception:
            pass
    return wins

def _search_by_child_text(titles: List[str]) -> List[WinInfo]:
    found: List[WinInfo] = []
    if not titles:
        return found
    desk = Desktop(backend="uia")
    for top in desk.windows(visible_only=True):
        try:
            for want in titles:
                if not want:
                    continue
                try:
                    hits = top.descendants(title_re=f".*{want}.*")
                    if hits:
                        tp = hits[0].top_level_parent()
                        r = tp.rectangle()
                        found.append(WinInfo(title=want, rect=_rect_tuple(r)))
                except Exception:
                    pass
        except Exception:
            pass
    return found

def _grab_rect(mon: mss.mss, rect, margin: int = 0):
    l, t, r, b = rect
    l -= margin; t -= margin; r += margin; b += margin
    w = max(1, r - l); h = max(1, b - t)
    bbox = {"left": l, "top": t, "width": w, "height": h}
    return mon.grab(bbox)

def capture_windows(titles: List[str], margin: int = 8) -> Dict[str, "PIL.Image.Image"]:
    from PIL import Image
    imgs: Dict[str, Image.Image] = {}

    # 1차: 상위 윈도우 제목 매칭
    wins = _search_by_top_titles(titles)

    # 2차: 못 찾은 것만 자식 컨트롤 텍스트 매칭
    target_set = {t for t in titles if t}
    found_titles = {w.title for w in wins}
    need_child = list(target_set - found_titles)
    if need_child:
        wins += _search_by_child_text(need_child)

    if not wins:
        return imgs

    with mss.mss() as mon:
        for w in wins:
            raw = _grab_rect(mon, w.rect, margin=margin)
            img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
            imgs[w.title] = img
    return imgs

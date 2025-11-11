# C:\GangTalkMacro\GangTalkMacro\text_grabber.py
import time
import re
from typing import Optional, Tuple, List
import pyperclip
from pywinauto import Desktop
from pywinauto.keyboard import send_keys

def _find_window(title: str):
    desk = Desktop(backend="uia")
    # 정확히 같거나 포함 둘 다 잡기
    try:
        return desk.window(title=title)
    except Exception:
        try:
            return desk.window(title_re=re.escape(title))
        except Exception:
            # 제목 일부만 들어있는 창
            wins = [w for w in desk.windows(visible_only=True) if title in (w.window_text() or "")]
            return wins[0] if wins else None

def copy_chat_text(
    win_title: str,
    click_offset: Tuple[int, int] = (240, 120),
    max_wait: float = 1.0,
) -> str:
    """
    1) 창 찾아 전면으로
    2) 메시지 영역을 한 번 클릭(선택 포커스)
    3) Ctrl+A / Ctrl+C
    4) 클립보드에서 텍스트 반환
    """
    win = _find_window(win_title)
    if not win:
        return ""
    win.set_focus()
    r = win.rectangle()
    x = r.left + int(click_offset[0])
    y = r.top  + int(click_offset[1])
    # 메시지 영역을 한번 클릭해서 포커스
    try:
        win.click_input(coords=(x, y))
    except Exception:
        pass

    # 전체 선택 + 복사
    pyperclip.copy("")        # 클립보드 비우기
    send_keys("^a")           # Ctrl+A
    time.sleep(0.05)
    send_keys("^c")           # Ctrl+C

    # 클립보드 기다림
    t0 = time.time()
    while time.time() - t0 < max_wait:
        txt = pyperclip.paste()
        if txt:
            return txt
        time.sleep(0.05)
    return ""


def paste_into_target(
    target_title_contains: str,
    text: str,
    input_click_offset: Tuple[int, int] = (600, 720),
    press_enter: bool = True,
):
    """
    대상 창을 찾아 입력창에 붙여넣기.
    - 대상은 ‘창 제목에 특정 문자열이 포함’되는 창
    - 입력창 대략 좌표를 클릭 후 Ctrl+V
    """
    desk = Desktop(backend="uia")
    wins = [w for w in desk.windows(visible_only=True) if target_title_contains in (w.window_text() or "")]
    if not wins:
        return False
    win = wins[0]
    win.set_focus()
    r = win.rectangle()
    x = r.left + int(input_click_offset[0])
    y = r.top  + int(input_click_offset[1])
    try:
        win.click_input(coords=(x, y))
    except Exception:
        pass

    pyperclip.copy(text)
    time.sleep(0.05)
    send_keys("^v")
    if press_enter:
        time.sleep(0.05)
        send_keys("{ENTER}")
    return True

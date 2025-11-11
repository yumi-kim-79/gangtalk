# main_tray.py
# -*- coding: utf-8 -*-
import os, sys, threading, webbrowser, traceback
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as Item, Menu

# macro_worker.py 에 MacroWorker, BASE_DIR, pjoin 가 있어야 합니다.
from macro_worker import MacroWorker, BASE_DIR, pjoin

# --- 콘솔 UTF-8 (윈도우 한글 깨짐 방지) ---
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# --- 작업 폴더를 앱 루트로 고정 (아이콘/설정 경로 문제 방지) ---
try:
    os.chdir(BASE_DIR())
except Exception:
    pass

worker = MacroWorker()

def _fallback_icon(size=64):
    """icon.ico 없을 때 사용할 임시 아이콘(PIL로 생성)"""
    img = Image.new("RGBA", (size, size), (30, 30, 30, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, size-8, size-8), fill=(90, 180, 255, 255))
    d.text((size//3-6, size//3), "G", fill=(0, 0, 0, 255))
    return img

def load_icon():
    ico_path = pjoin("icon.ico")
    if os.path.exists(ico_path):
        try:
            return Image.open(ico_path)
        except Exception:
            pass
    return _fallback_icon()

def _is_running():
    """워커가 이미 동작 중인지 확인"""
    try:
        return worker._th is not None and worker._th.is_alive()
    except Exception:
        return False

def _notify(icon, msg):
    # pystray 의 notify는 플랫폼별 지원. 실패해도 조용히 무시.
    try:
        icon.notify(msg)
    except Exception:
        pass

def act_start(icon, item):
    try:
        if _is_running():
            _notify(icon, "이미 실행 중입니다.")
            return
        worker.start()
        _notify(icon, "매크로 시작")
        icon.update_menu()
    except Exception:
        print("start error:\n" + traceback.format_exc())

def act_pause(icon, item):
    try:
        if not _is_running():
            _notify(icon, "아직 실행 전입니다. 먼저 '시작'을 눌러주세요.")
            return
        if worker._pause.is_set():
            worker.pause(False)
            _notify(icon, "재개")
        else:
            worker.pause(True)
            _notify(icon, "일시정지")
        icon.update_menu()
    except Exception:
        print("pause error:\n" + traceback.format_exc())

def act_open_log(icon, item):
    logp = pjoin("macro.log")
    if os.path.exists(logp):
        os.startfile(logp)
    else:
        # 없으면 폴더라도 열어주기
        webbrowser.open('.')

def act_open_config(icon, item):
    cfgp = pjoin("config.json")
    if os.path.exists(cfgp):
        os.startfile(cfgp)
    else:
        webbrowser.open('.')

def act_open_vendor(icon, item):
    vp = pjoin("vendor_map.json")
    if os.path.exists(vp):
        os.startfile(vp)
    else:
        webbrowser.open('.')

def act_quit(icon, item):
    try:
        worker.stop()
    except Exception:
        pass
    try:
        icon.stop()
    finally:
        os._exit(0)

def paused_checked(item):
    return getattr(worker, "_pause", None) is not None and worker._pause.is_set()

def running_checked(item):
    return _is_running()

def main():
    icon_img = load_icon()
    menu = Menu(
        Item('실행 중 표시(읽기전용)', lambda *_: None, checked=running_checked, enabled=False),
        Item('시작', act_start),
        Item('일시정지(토글)', act_pause, checked=paused_checked),
        Item('로그 열기', act_open_log),
        Item('config.json 열기', act_open_config),
        Item('vendor_map.json 열기', act_open_vendor),
        Item('종료', act_quit)
    )
    tray = pystray.Icon('GangTalkMacro', icon_img, 'GangTalk 매크로', menu)

    # 앱 시작 0.8초 후 자동 시작(트레이 올라간 뒤 실행 보장)
    def _delayed_start():
        try:
            if not _is_running():
                worker.start()
                _notify(tray, "매크로 자동 시작")
                tray.update_menu()
        except Exception:
            print("auto-start error:\n" + traceback.format_exc())
    threading.Timer(0.8, _delayed_start).start()

    tray.run()

if __name__ == '__main__':
    main()

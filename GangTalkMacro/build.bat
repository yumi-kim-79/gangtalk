@echo off
set NAME=GangTalkMacro
cd /d %~dp0
py -m pip install --upgrade pip
py -m pip install -r requirements.txt

REM 콘솔 숨김, 아이콘 포함
py -m PyInstaller --noconsole --name %NAME% --icon icon.ico ^
  --add-data "icon.ico;." ^
  main_tray.py

echo.
echo 빌드 완료: dist\%NAME%.exe
pause

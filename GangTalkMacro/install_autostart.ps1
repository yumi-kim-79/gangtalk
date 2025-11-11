# install_autostart.ps1
$exe = Join-Path $PSScriptRoot "dist\GangTalkMacro.exe"
if (!(Test-Path $exe)) { Write-Host "먼저 build.bat로 빌드하세요."; exit 1 }
$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$lnk = Join-Path $startup "GangTalkMacro.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($lnk)
$Shortcut.TargetPath = $exe
$Shortcut.WorkingDirectory = (Split-Path $exe)
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Host "자동 시작 등록 완료 -> $lnk"

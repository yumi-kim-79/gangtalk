# uninstall_autostart.ps1
$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$lnk = Join-Path $startup "GangTalkMacro.lnk"
if (Test-Path $lnk) { Remove-Item $lnk; Write-Host "자동 시작 해제 완료" } else { Write-Host "등록된 바로가기 없음" }

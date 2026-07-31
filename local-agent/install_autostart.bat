@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "install_autostart.ps1"
pause

@echo off
rem 双击本文件即可启动像素龙桌宠,无需终端。
cd /d "%~dp0"
start "" "node_modules\electron\dist\electron.exe" .
exit

@echo off
echo Building GIFME Standalone Updater...
cd updater\standalone-updater
call build-standalone.bat
cd ..\..
echo Done!
pause 
@echo off
echo ===================================================
echo GIFME FFmpeg Downloader
echo ===================================================
echo.
echo This script will help you download and set up FFmpeg for GIFME.
echo.

REM Create directories if they don't exist
if not exist "ffmpeg-win\bin" mkdir "ffmpeg-win\bin"

echo Please download FFmpeg from one of these sources:
echo.
echo 1. https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip (Recommended)
echo 2. https://ffmpeg.org/download.html
echo.
echo After downloading:
echo 1. Extract the ZIP file
echo 2. Copy these files to the ffmpeg-win\bin directory:
echo    - ffmpeg.exe
echo    - ffprobe.exe
echo    - ffplay.exe
echo.
echo Press any key to open the download page...
pause > nul

start "" "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

echo.
echo After downloading and extracting, please copy the files manually.
echo.
echo Once you've copied the files, you can continue with building GIFME.
echo.
pause 
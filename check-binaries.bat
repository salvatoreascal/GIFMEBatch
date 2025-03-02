@echo off
echo Checking binary files structure...

echo.
echo Checking FFmpeg...
if exist ffmpeg-win\bin\ffmpeg.exe (
    echo FFmpeg found at ffmpeg-win\bin\ffmpeg.exe
) else (
    echo ERROR: FFmpeg not found at ffmpeg-win\bin\ffmpeg.exe
)

echo.
echo Checking Gifsicle...
if exist gifsicle-win\gifsicle.exe (
    echo Gifsicle found at gifsicle-win\gifsicle.exe
) else (
    echo ERROR: Gifsicle not found at gifsicle-win\gifsicle.exe
)

echo.
echo Checking installer scripts...
if exist installer\post-install.js (
    echo post-install.js found
) else (
    echo ERROR: post-install.js not found
)

if exist installer\post-install.bat (
    echo post-install.bat found
) else (
    echo ERROR: post-install.bat not found
)

if exist installer\installer.nsh (
    echo installer.nsh found
) else (
    echo ERROR: installer.nsh not found
)

echo.
echo Checking icon...
if exist build\icon.ico (
    echo Icon found at build\icon.ico
) else (
    echo ERROR: Icon not found at build\icon.ico
)

echo.
echo Check complete.
pause 
@echo off
echo Creating GIFME release package...

REM Get version from package.json
for /f "tokens=2 delims=:," %%a in ('type package.json ^| findstr "version"') do (
    set VERSION=%%a
    set VERSION=!VERSION:"=!
    set VERSION=!VERSION: =!
)

REM Create output directory if it doesn't exist
if not exist "release" mkdir release

REM Check if installer exists
if not exist "dist_v2\GIFME-Setup.exe" (
    echo Error: GIFME-Setup.exe not found. Please build the installer first.
    echo Run Inno Setup to build the installer.
    exit /b 1
)

REM Check if standalone updater build exists
if not exist "dist_v2\updater-build\GIFME Updater-win32-x64" (
    echo Error: Standalone updater build not found. Please build the updater first.
    echo Run build-standalone-updater.bat to build the standalone updater.
    exit /b 1
)

REM Check if portable package exists
if not exist "dist_v2\packaged\GIFME-win32-x64" (
    echo Error: Portable package not found. Please build the app first.
    echo Run npm run package to build the app.
    exit /b 1
)

REM Check if FFmpeg executables exist
if not exist "ffmpeg-win\bin\ffmpeg.exe" (
    echo Error: ffmpeg.exe not found. Please download FFmpeg first.
    echo Run download-ffmpeg.bat
    exit /b 1
)

if not exist "ffmpeg-win\bin\ffprobe.exe" (
    echo Error: ffprobe.exe not found. Please download FFmpeg first.
    echo Run download-ffmpeg.bat
    exit /b 1
)

if not exist "ffmpeg-win\bin\ffplay.exe" (
    echo Error: ffplay.exe not found. Please download FFmpeg first.
    echo Run download-ffmpeg.bat
    exit /b 1
)

REM Copy installer
echo Copying installer...
copy "dist_v2\GIFME-Setup.exe" "release\GIFME-Setup.exe"

REM Create ZIP file of the standalone updater
echo Creating ZIP file of the standalone updater...
powershell -Command "Compress-Archive -Path 'dist_v2\updater-build\GIFME Updater-win32-x64\*' -DestinationPath 'release\GIFME-Updater-win32-x64.zip' -Force"

REM Create temporary directory for packaging
echo Creating temporary directory for packaging...
set TEMP_DIR=temp_extract
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy portable app files
echo Copying portable app files...
xcopy "dist_v2\packaged\GIFME-win32-x64" "%TEMP_DIR%" /E /I /H

REM Create FFmpeg directory in the correct location (resources/ffmpeg-win/bin)
echo Adding FFmpeg executables to the correct location...
mkdir "%TEMP_DIR%\resources\ffmpeg-win\bin"
copy "ffmpeg-win\bin\ffmpeg.exe" "%TEMP_DIR%\resources\ffmpeg-win\bin\"
copy "ffmpeg-win\bin\ffprobe.exe" "%TEMP_DIR%\resources\ffmpeg-win\bin\"
copy "ffmpeg-win\bin\ffplay.exe" "%TEMP_DIR%\resources\ffmpeg-win\bin\"

REM Create ZIP file of the portable version with FFmpeg
echo Creating ZIP file of the portable version...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath 'release\GIFME-win32-x64.zip' -Force"

REM Clean up
echo Cleaning up...
rmdir /s /q "%TEMP_DIR%"

echo Release package created successfully!
echo The following files have been created in the release directory:
echo - GIFME-Setup.exe (Installer)
echo - GIFME-Updater-win32-x64.zip (Standalone updater package)
echo - GIFME-win32-x64.zip (Portable version and update package)
echo.
echo Upload these files to GitHub releases.

pause 
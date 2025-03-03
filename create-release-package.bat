@echo off
echo Creating GIFME release package...

REM Set version from package.json
for /f "tokens=2 delims=:," %%a in ('type package.json ^| findstr "version"') do (
    set VERSION=%%a
    set VERSION=!VERSION:"=!
    set VERSION=!VERSION: =!
)

REM Create output directory
set OUTPUT_DIR=release
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

REM Check if the required files exist
if not exist "dist_v2\GIFME-Setup.exe" (
    echo Error: GIFME-Setup.exe not found. Please build the installer first.
    echo Run build-exe-only.bat and then build-inno-installer.bat
    pause
    exit /b 1
)

if not exist "dist_v2\GIFME-Updater.exe" (
    echo Error: GIFME-Updater.exe not found. Please build the updater first.
    echo Run build-updater.bat
    pause
    exit /b 1
)

if not exist "dist_v2\packaged\GIFME-win32-x64" (
    echo Error: GIFME portable package not found. Please build the executable first.
    echo Run build-exe-only.bat
    pause
    exit /b 1
)

REM Copy installer and updater
echo Copying installer and updater...
copy "dist_v2\GIFME-Setup.exe" "%OUTPUT_DIR%\GIFME-Setup.exe"
copy "dist_v2\GIFME-Updater.exe" "%OUTPUT_DIR%\GIFME-Updater.exe"

REM Create ZIP file of the portable version
echo Creating portable ZIP package...
powershell Compress-Archive -Path "dist_v2\packaged\GIFME-win32-x64\*" -DestinationPath "%OUTPUT_DIR%\GIFME-win32-x64.zip" -Force

echo Release package created successfully in the %OUTPUT_DIR% directory.
echo Files:
echo - %OUTPUT_DIR%\GIFME-Setup.exe
echo - %OUTPUT_DIR%\GIFME-Updater.exe
echo - %OUTPUT_DIR%\GIFME-win32-x64.zip

echo.
echo Please upload these files to GitHub releases.
pause 
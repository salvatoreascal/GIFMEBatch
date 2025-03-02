@echo off
echo Building GIFME executable package...

REM Clear electron-packager cache
echo Clearing electron-packager cache...
rmdir /s /q "%LOCALAPPDATA%\electron-packager\cache" 2>nul

REM Create a new output directory
echo Creating new output directory...
set OUTPUT_DIR=dist_v2
mkdir %OUTPUT_DIR% 2>nul

REM Package the application
echo Packaging application...
npx electron-packager . GIFME --platform=win32 --arch=x64 --out=%OUTPUT_DIR%/packaged --overwrite --icon=build/icon.ico --asar --extra-resource=ffmpeg-win --extra-resource=gifsicle-win --extra-resource=installer

if %ERRORLEVEL% NEQ 0 (
    echo Packaging failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

REM Check if the executable exists
if not exist "%CD%\%OUTPUT_DIR%\packaged\GIFME-win32-x64\GIFME.exe" (
    echo Error: GIFME.exe not found in the expected location.
    pause
    exit /b 1
)

echo Build completed successfully!
echo Executable created at: %CD%\%OUTPUT_DIR%\packaged\GIFME-win32-x64\GIFME.exe
echo You can distribute the entire folder: %CD%\%OUTPUT_DIR%\packaged\GIFME-win32-x64

REM Create a ZIP file of the packaged application
echo Creating ZIP file...
powershell Compress-Archive -Path "%CD%\%OUTPUT_DIR%\packaged\GIFME-win32-x64\*" -DestinationPath "%CD%\%OUTPUT_DIR%\GIFME-1.0.0-win64.zip" -Force

if %ERRORLEVEL% NEQ 0 (
    echo ZIP creation failed with error code %ERRORLEVEL%
) else (
    echo ZIP file created at: %CD%\%OUTPUT_DIR%\GIFME-1.0.0-win64.zip
)

pause 
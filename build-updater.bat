@echo off
echo Building GIFME Updater...

REM Navigate to the updater directory
cd updater

REM Install dependencies if needed
echo Installing dependencies...
call npm install

REM Build the updater
echo Building updater executable...
call npm run dist

REM Copy the updater to the main dist directory
echo Copying updater to dist directory...
if not exist "..\dist_v2" mkdir "..\dist_v2"

REM Check if the portable exe exists
if exist "dist\GIFME-Updater.exe" (
    copy "dist\GIFME-Updater.exe" "..\dist_v2\GIFME-Updater.exe"
) else (
    REM If portable exe doesn't exist, try to copy from win-unpacked directory
    if exist "dist\win-unpacked\GIFME Updater.exe" (
        copy "dist\win-unpacked\GIFME Updater.exe" "..\dist_v2\GIFME-Updater.exe"
    ) else (
        echo ERROR: Could not find the updater executable.
        echo Please check the build output for errors.
        cd ..
        exit /b 1
    )
)

echo Updater built successfully!
echo Executable created at: %CD%\..\dist_v2\GIFME-Updater.exe

cd ..
pause 
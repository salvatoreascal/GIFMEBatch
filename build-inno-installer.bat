@echo off
echo Building GIFME installer with Inno Setup...

REM Check if the packaged application exists
if not exist "dist_v2\packaged\GIFME-win32-x64" (
    echo The packaged application does not exist.
    echo Please run build-exe-only.bat first.
    pause
    exit /b 1
)

REM Check if Inno Setup is installed
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else (
    echo Inno Setup is not installed or not found in the expected location.
    echo Please make sure Inno Setup 6 is installed.
    pause
    exit /b 1
)

REM Build the installer
echo Building installer...
"%ISCC%" gifme-setup.iss

if %ERRORLEVEL% NEQ 0 (
    echo Installer creation failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo Installer created successfully at dist_v2\GIFME-Setup.exe
pause 
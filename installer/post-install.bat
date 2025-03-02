@echo off
echo Running post-install script...
cd "%~dp0"
node post-install.js
echo Post-install script completed.
exit 0 
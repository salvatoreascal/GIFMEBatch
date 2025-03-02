!macro customInstall
  ; Run the post-install script to add binaries to PATH
  ExecWait '"$INSTDIR\resources\installer\post-install.bat"'
!macroend

!macro customUnInstall
  ; Nothing special for uninstall
!macroend 
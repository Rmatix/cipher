# Custom NSIS Script for Cipher
# Manages: PATH env variable + multi-product installer (Usuario / Developer / Completo)

!define ENV_PATH "HKCU"
!define ENV_KEY "Environment"

# Helper Macro: StrContains
!macro StrContains HAYSTACK NEEDLE RESULT ID
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  
  StrCpy $R1 "${HAYSTACK}"
  StrCpy $R0 "${NEEDLE}"
  StrLen $R2 $R1
  StrLen $R3 $R0
  StrCpy $R4 0
  StrCpy ${RESULT} "false"
  
loop_sc_${ID}:
  StrCpy $R5 $R1 $R3 $R4
  StrCmp $R5 $R0 found_sc_${ID}
  IntOp $R4 $R4 + 1
  IntCmp $R4 $R2 loop_sc_${ID} loop_sc_${ID} not_found_sc_${ID}
  
found_sc_${ID}:
  StrCpy ${RESULT} "true"
  
not_found_sc_${ID}:
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

# Helper Macro: StrReplace
!macro StrReplace HAYSTACK NEEDLE REPLACEMENT RESULT ID
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  Push $R6
  Push $R7
  
  StrCpy $R2 "${HAYSTACK}"
  StrCpy $R1 "${NEEDLE}"
  StrCpy $R0 "${REPLACEMENT}"
  StrLen $R4 $R2
  StrLen $R5 $R1
  StrCpy $R6 ""
  StrCpy $R3 0
  
loop_sr_${ID}:
  StrCpy $R7 $R2 $R5 $R3
  StrCmp $R7 $R1 found_sr_${ID}
  # Append current char to Result
  StrCpy $R7 $R2 1 $R3
  StrCpy $R6 "$R6$R7"
  IntOp $R3 $R3 + 1
  Goto check_sr_${ID}
  
found_sr_${ID}:
  # Append Replacement to Result
  StrCpy $R6 "$R6$R0"
  IntOp $R3 $R3 + $R5
  
check_sr_${ID}:
  IntCmp $R3 $R4 done_sr_${ID} done_sr_${ID} loop_sr_${ID}
  
done_sr_${ID}:
  StrCpy ${RESULT} $R6
  
  Pop $R7
  Pop $R6
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

!macro customInstall
  # ── Product selection dialog ──────────────────────────────────
  # Presents 3 choices to the user:
  #   Abort  = Cipher Usuario  (profile 0) - lightweight editor
  #   Retry  = Cipher Developer (profile 1) - full AI + advanced tools
  #   Ignore = Cipher Completo  (profile 2) - everything including Composer
  MessageBox MB_ABORTRETRYIGNORE \
    "Selecciona la edicion de Cipher a instalar:$\n$\n\
    [Ignorar]  Cipher Completo$\n\
    Todo lo de Developer + Composer multi-archivo,$\n\
    Workflows avanzados, Debug IA y Memory.$\n$\n\
    [Reintentar]  Cipher Developer$\n\
    Agente IA completo (Chat / Plan / Dev),$\n\
    terminal avanzada, Git integrado, compiladores.$\n$\n\
    [Anular]  Cipher Usuario$\n\
    Editor de codigo ligero, ideal para edicion$\n\
    rapida sin servicios de IA en segundo plano." \
    IDABORT profile_user IDRETRY profile_developer IDIGNORE profile_completo

profile_user:
  DetailPrint "Instalando Cipher: Edicion Usuario..."
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 0
  WriteRegStr  HKCU "Software\Cipher" "ProfileName" "usuario"
  Goto start_path_config

profile_developer:
  DetailPrint "Instalando Cipher: Edicion Developer..."
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 1
  WriteRegStr  HKCU "Software\Cipher" "ProfileName" "developer"
  Goto start_path_config

profile_completo:
  DetailPrint "Instalando Cipher: Edicion Completa..."
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 2
  WriteRegStr  HKCU "Software\Cipher" "ProfileName" "completo"
  Goto start_path_config

start_path_config:
  DetailPrint "Configurando variable de entorno PATH..."
  # HKCU Environment PATH
  ReadRegStr $0 ${ENV_PATH} "${ENV_KEY}" "PATH"
  
  # Check if already in PATH
  StrCmp $0 "" write_empty
  
  !insertmacro StrContains "$0" "$INSTDIR" $1 "inst"
  StrCmp $1 "true" already_in_path
  
  # Append to path
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$0;$INSTDIR"
  Goto notify_change
  
write_empty:
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$INSTDIR"
  Goto notify_change

already_in_path:
  DetailPrint "La ruta ya esta en el PATH."
  Goto end

notify_change:
  # Notify system of environment changes
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

end:
!macroend

!macro customUninstall
  DetailPrint "Removiendo de la variable de entorno PATH..."
  ReadRegStr $0 ${ENV_PATH} "${ENV_KEY}" "PATH"
  StrCmp $0 "" end_uninstall
  
  # Remove $INSTDIR from PATH by replacing patterns using unique IDs
  !insertmacro StrReplace "$0" "$INSTDIR;" "" $0 "un1"
  !insertmacro StrReplace "$0" ";$INSTDIR" "" $0 "un2"
  !insertmacro StrReplace "$0" "$INSTDIR" "" $0 "un3"
  
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$0"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

end_uninstall:
!macroend

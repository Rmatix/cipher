# Custom NSIS Script for Cipher v2.8.0
# Uses only electron-builder supported hooks: !macro customInstall / customUninstall
# Automatically registers profiles, context menus, and PATH without MessageBox popups.

!include LogicLib.nsh

!define ENV_PATH "HKCU"
!define ENV_KEY  "Environment"

# ── StrContains helper macro ────────────────────────────────────
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

cipher_loop_sc_${ID}:
  StrCpy $R5 $R1 $R3 $R4
  StrCmp $R5 $R0 cipher_found_sc_${ID}
  IntOp $R4 $R4 + 1
  IntCmp $R4 $R2 cipher_loop_sc_${ID} cipher_loop_sc_${ID} cipher_not_found_sc_${ID}

cipher_found_sc_${ID}:
  StrCpy ${RESULT} "true"

cipher_not_found_sc_${ID}:
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend

# ── StrReplace helper macro ─────────────────────────────────────
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

cipher_loop_sr_${ID}:
  StrCpy $R7 $R2 $R5 $R3
  StrCmp $R7 $R1 cipher_found_sr_${ID}
  StrCpy $R7 $R2 1 $R3
  StrCpy $R6 "$R6$R7"
  IntOp $R3 $R3 + 1
  Goto cipher_check_sr_${ID}

cipher_found_sr_${ID}:
  StrCpy "$R6" "$R6$R0"
  IntOp $R3 $R3 + $R5

cipher_check_sr_${ID}:
  IntCmp $R3 $R4 cipher_done_sr_${ID} cipher_done_sr_${ID} cipher_loop_sr_${ID}

cipher_done_sr_${ID}:
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

# ── customInstall ───────────────────────────────────────────────
!macro customInstall

  # ── Step 1: Profile Registration ───────────────────────────
  StrCmp "$(^Name)" "Cipher Lite" cipher_is_lite
  StrCmp "$(^Name)" "Cipher Dev" cipher_is_dev
  
  # Default fallback is Studio
  DetailPrint "Perfil: Cipher Studio"
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 2
  WriteRegStr   HKCU "Software\Cipher" "ProfileName" "studio"
  Goto cipher_profile_done

cipher_is_lite:
  DetailPrint "Perfil: Cipher Lite"
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 0
  WriteRegStr   HKCU "Software\Cipher" "ProfileName" "lite"
  Goto cipher_profile_done

cipher_is_dev:
  DetailPrint "Perfil: Cipher Dev"
  WriteRegDWORD HKCU "Software\Cipher" "Profile" 1
  WriteRegStr   HKCU "Software\Cipher" "ProfileName" "dev"
  Goto cipher_profile_done

cipher_profile_done:

  # ── Step 2: Add to PATH ────────────────────────────────────
  DetailPrint "Agregando Cipher al PATH..."
  ReadRegStr $R0 ${ENV_PATH} "${ENV_KEY}" "PATH"
  StrCmp $R0 "" cipher_path_empty
  !insertmacro StrContains "$R0" "$INSTDIR" $R1 "inst"
  StrCmp $R1 "true" cipher_path_exists
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$R0;$INSTDIR"
  Goto cipher_path_notify

cipher_path_empty:
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$INSTDIR"
  Goto cipher_path_notify

cipher_path_exists:
  DetailPrint "La ruta ya existe en el PATH."
  Goto cipher_skip_path

cipher_path_notify:
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

cipher_skip_path:

  # ── Step 3: Context Menu ───────────────────────────────────
  DetailPrint "Registrando menu contextual..."
  WriteRegStr HKCU "Software\Classes\*\shell\OpenWithCipher"                    "" "Abrir con Cipher"
  WriteRegStr HKCU "Software\Classes\*\shell\OpenWithCipher"                    "Icon" "$INSTDIR\$(^Name).exe"
  WriteRegStr HKCU "Software\Classes\*\shell\OpenWithCipher\command"            "" '"$INSTDIR\$(^Name).exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenWithCipher"            "" "Abrir carpeta con Cipher"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenWithCipher"            "Icon" "$INSTDIR\$(^Name).exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenWithCipher\command"    "" '"$INSTDIR\$(^Name).exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenWithCipher" "" "Abrir con Cipher"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenWithCipher" "Icon" "$INSTDIR\$(^Name).exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenWithCipher\command" "" '"$INSTDIR\$(^Name).exe" "%V"'

!macroend

# ── customUninstall ─────────────────────────────────────────────
!macro customUninstall

  DetailPrint "Removiendo Cipher del PATH..."
  ReadRegStr $R0 ${ENV_PATH} "${ENV_KEY}" "PATH"
  StrCmp $R0 "" cipher_uninstall_path_done
  !insertmacro StrReplace "$R0" "$INSTDIR;" "" $R0 "un1"
  !insertmacro StrReplace "$R0" ";$INSTDIR" "" $R0 "un2"
  !insertmacro StrReplace "$R0" "$INSTDIR"  "" $R0 "un3"
  WriteRegExpandStr ${ENV_PATH} "${ENV_KEY}" "PATH" "$R0"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

cipher_uninstall_path_done:

  DetailPrint "Removiendo accesos directos y registro..."
  Delete "$DESKTOP\$(^Name).lnk"
  DeleteRegKey HKCU "Software\Classes\*\shell\OpenWithCipher"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\OpenWithCipher"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\OpenWithCipher"
  DeleteRegKey HKCU "Software\Cipher"

!macroend

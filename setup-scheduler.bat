@echo off
title Setup Scheduler AppFerie
color 0E

echo ========================================
echo   Setup Scheduler Automatico AppFerie
echo ========================================
echo.

REM Ottieni il percorso della directory corrente
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Crea task per esecuzione ogni 8 ore
schtasks /create /tn "AppFerie_Auto_Update" /tr "\"%SCRIPT_DIR%\scheduler.bat\"" /sc hourly /mo 8 /st 08:00 /f

REM Crea task per esecuzione all'avvio
schtasks /create /tn "AppFerie_Startup" /tr "\"%SCRIPT_DIR%\start-automation.bat\"" /sc onstart /delay 0002:00 /f

echo.
echo ✅ Scheduler configurato con successo!
echo.
echo Task creati:
echo - AppFerie_Auto_Update: Ogni 8 ore dalle 08:00
echo - AppFerie_Startup: All'avvio del sistema (con ritardo di 2 minuti)
echo.
echo Percorso utilizzato: %SCRIPT_DIR%
echo.
echo Per verificare: Pannello di controllo ^> Utilità di pianificazione
echo.
pause
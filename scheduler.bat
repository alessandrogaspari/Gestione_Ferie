@echo off
title AppFerie - Scheduler Automatico
color 0B

echo ========================================
echo    AppFerie - Aggiornamento Schedulato
echo ========================================
echo.
echo Data/Ora: %DATE% %TIME%
echo.

REM Cambia alla directory dello script
cd /d "%~dp0"

echo Esecuzione aggiornamento automatico...
node ngrok-automation.js

echo.
echo Aggiornamento completato alle %TIME%
echo Prossimo aggiornamento tra 8 ore
echo.

REM Log dell'esecuzione
echo %DATE% %TIME% - Aggiornamento eseguito >> automation.log
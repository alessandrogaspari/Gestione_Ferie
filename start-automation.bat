@echo off
title AppFerie - Automazione Completa
color 0A

echo ========================================
echo    AppFerie - Sistema di Automazione
echo ========================================
echo.

REM Cambia alla directory dello script
cd /d "%~dp0"

echo [%TIME%] Avvio del server AppFerie...
start "AppFerie Server" cmd /k "node server.js"

echo [%TIME%] Attesa avvio server (10 secondi)...
timeout /t 10 /nobreak >nul

echo [%TIME%] Avvio ngrok sulla porta 3000 con configurazione per bypassare avviso...
start "Ngrok Tunnel" cmd /k "ngrok http 3000 --request-header-add \"ngrok-skip-browser-warning:true\""

echo [%TIME%] Attesa inizializzazione ngrok (15 secondi)...
timeout /t 15 /nobreak >nul

echo [%TIME%] Esecuzione script di automazione...
node ngrok-automation.js

echo.
echo ========================================
echo   Automazione completata!
echo   Controlla i terminali aperti per i log
echo ========================================
echo.
pause
@echo off
chcp 65001 >nul
title Polo Oeste - Servidor local
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0assets\servidor-local.ps1"
if errorlevel 1 (
    echo.
    echo No se pudo iniciar Polo Oeste.
    pause
)

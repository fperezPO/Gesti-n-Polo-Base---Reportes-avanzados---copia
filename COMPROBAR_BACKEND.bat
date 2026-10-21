@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta disponible en PATH.
  pause
  exit /b 1
)
node --check backend\server.js
if errorlevel 1 (
  echo ERROR: La validacion del servidor fallo.
  pause
  exit /b 1
)
echo Servidor validado correctamente.
pause

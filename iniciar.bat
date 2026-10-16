@echo off
echo ====================================================
echo  Iniciando Negocios Inmobiliarios (Frontend + Backend)
echo ====================================================
echo.
echo 1. Iniciando Backend en el puerto 4000...
start "Backend Inmobiliaria (Puerto 4000)" cmd /k "cd /d "%~dp0backend" && node src/server.js"
echo 2. Iniciando Frontend en el puerto 3000...
start "Frontend Inmobiliaria (Puerto 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ====================================================
echo  Servidores iniciados en segundo plano / ventanas:
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:4000
echo ====================================================

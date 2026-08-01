@echo off
REM Builds a standalone ILeadsOutlookAgent.exe from outlook_agent.py, so it
REM can be run by double-clicking - no Python knowledge needed after this.
REM Run this once, on Windows, with Python installed. The result appears in
REM the "dist" folder next to this script.

cd /d "%~dp0"

echo Instalando dependencias (pywin32, pyinstaller)...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo Fallo al instalar dependencias. Asegurate de tener Python instalado
    echo y accesible como "python" desde este terminal.
    pause
    exit /b 1
)

echo.
echo Generando ILeadsOutlookAgent.exe...
python -m PyInstaller --onefile --name ILeadsOutlookAgent --hidden-import win32timezone outlook_agent.py
if errorlevel 1 (
    echo.
    echo Fallo al generar el ejecutable.
    pause
    exit /b 1
)

echo.
echo Listo. Encontraras ILeadsOutlookAgent.exe dentro de la carpeta "dist".
echo Puedes moverlo donde quieras y ejecutarlo con doble clic.
pause

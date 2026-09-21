@echo off
rem One-click launcher: starts Docker (Postgres/Redis), the backend, the
rem frontend, and a Cloudflare Quick Tunnel, then opens the public URL.
rem All the actual work is in scripts\start-local-demo.ps1 - this just
rem runs it with the execution policy it needs, non-interactively.

setlocal
set "SCRIPT_DIR=%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\start-local-demo.ps1"

if errorlevel 1 (
    echo.
    echo Something went wrong starting the Inventory app. See the messages above.
    pause
)

endlocal

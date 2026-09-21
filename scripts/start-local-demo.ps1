<#
.SYNOPSIS
  Starts the Inventory app locally (existing Postgres/Redis containers,
  existing backend venv, existing frontend) and opens a Cloudflare Quick
  Tunnel to the Vite dev server, for a temporary remote demo.

.DESCRIPTION
  - Reuses existing Docker containers/volumes (never recreates them).
  - Checks ports 8000/5173/5174 and cloudflared before starting anything;
    if something unexpected is squatting a port, it stops and asks you
    rather than killing it.
  - Starts exactly one backend, one frontend, one tunnel.
  - Waits for the tunnel URL and runs health/login smoke tests against
    both the local and public addresses.

.USAGE
  From the project root:
    powershell -ExecutionPolicy Bypass -File scripts\start-local-demo.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cloudflaredExe = 'C:\cloudflared\cloudflared.exe'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    FAIL: $msg" -ForegroundColor Red }

function Get-PortOwner([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    return $proc
}

# ---------------------------------------------------------------
Write-Step "Checking ports 8000 / 5173 / 5174 for existing processes"
foreach ($port in 8000, 5173, 5174) {
    $proc = Get-PortOwner $port
    if ($proc) {
        Write-Warn "Port $port is in use by '$($proc.ProcessName)' (PID $($proc.Id))."
        $answer = Read-Host "    Stop this process so the demo can use port $port? [y/N]"
        if ($answer -eq 'y') {
            Stop-Process -Id $proc.Id -Force
            Write-Ok "Stopped PID $($proc.Id)."
        } else {
            Write-Err "Leaving port $port occupied. This may cause the wrong service to start, or Vite to pick a different port than expected."
        }
    } else {
        Write-Ok "Port $port is free."
    }
}

$existingTunnel = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($existingTunnel) {
    Write-Warn "cloudflared is already running (PID $($existingTunnel.Id))."
    $answer = Read-Host "    Stop the existing tunnel and start a fresh one? [y/N]"
    if ($answer -eq 'y') {
        $existingTunnel | Stop-Process -Force
        Write-Ok "Stopped existing cloudflared."
    } else {
        Write-Err "Leaving the existing tunnel running. A second tunnel will still be started below; you may end up with two."
    }
}

# ---------------------------------------------------------------
Write-Step "Checking Docker containers (Postgres / Redis)"
Push-Location $root
$composeStatus = docker compose ps --format json 2>$null
Pop-Location
if (-not $composeStatus) {
    Write-Warn "No containers found via docker compose. Starting them (existing volumes are reused, never recreated)."
    Push-Location $root
    docker compose up -d
    Pop-Location
} else {
    Write-Ok "Docker compose services already known to Docker. Ensuring they're up (this will NOT recreate volumes or data)."
    Push-Location $root
    docker compose up -d
    Pop-Location
}
Start-Sleep -Seconds 2

# ---------------------------------------------------------------
Write-Step "Starting backend (FastAPI/Uvicorn) on 127.0.0.1:8000"
$backendEnv = Join-Path $root 'backend\.env'
if (-not (Test-Path $backendEnv)) {
    Write-Warn "backend\.env not found. Copying backend\.env.example -> backend\.env (edit it if your DB credentials differ)."
    Copy-Item (Join-Path $root 'backend\.env.example') $backendEnv
}
$backendCmd = "cd '$root\backend'; .\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd -WindowStyle Normal

Write-Host "    Waiting for backend health check..."
$backendUp = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
        if ($resp.status -eq 'ok') { $backendUp = $true; break }
    } catch { }
}
if ($backendUp) { Write-Ok "Backend is up: http://127.0.0.1:8000/health -> {status: ok}" }
else { Write-Err "Backend did not respond on 127.0.0.1:8000/health within 30s. Check the backend window for errors (likely a DB connection issue - is Postgres reachable?)." }

# ---------------------------------------------------------------
Write-Step "Starting frontend (Vite) - reusing frontend\.env if present"
$frontendEnv = Join-Path $root 'frontend\.env'
if (-not (Test-Path $frontendEnv)) {
    Write-Warn "frontend\.env not found. Creating one with VITE_API_URL= (empty) so the app uses the Vite proxy for /api and /uploads."
    Set-Content -Path $frontendEnv -Value "VITE_API_URL=`n"
} else {
    $content = Get-Content $frontendEnv -Raw
    if ($content -notmatch 'VITE_API_URL\s*=\s*\r?\n' -and $content -match 'VITE_API_URL\s*=\s*\S') {
        Write-Warn "frontend\.env sets VITE_API_URL to a non-empty value. For the tunnel demo it should be EMPTY so requests go through the Vite proxy (relative /api paths), not a fixed localhost URL your boss's browser can't reach."
    }
}
$frontendCmd = "cd '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd -WindowStyle Normal

Write-Host "    Waiting for Vite dev server..."
$frontendPort = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    foreach ($p in 5173, 5174) {
        if (Get-PortOwner $p) { $frontendPort = $p; break }
    }
    if ($frontendPort) { break }
}
if ($frontendPort) { Write-Ok "Frontend is listening on port $frontendPort" }
else { Write-Err "Could not detect Vite on 5173 or 5174. Check the frontend window - it may have picked a different port; if so, re-run the tunnel step manually with that port." }

# ---------------------------------------------------------------
if ($frontendPort) {
    Write-Step "Starting Cloudflare Quick Tunnel -> http://localhost:$frontendPort"
    $logDir = Join-Path $env:TEMP 'inventory-demo'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $tunnelLog = Join-Path $logDir 'cloudflared.log'
    Remove-Item $tunnelLog -ErrorAction SilentlyContinue

    Start-Process -FilePath $cloudflaredExe `
        -ArgumentList 'tunnel', '--url', "http://localhost:$frontendPort" `
        -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelLog `
        -WindowStyle Minimized

    Write-Host "    Waiting for the public URL..."
    $publicUrl = $null
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $tunnelLog) {
            $match = Select-String -Path $tunnelLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) { $publicUrl = $match.Matches[0].Value; break }
        }
    }
    if ($publicUrl) { Write-Ok "Public URL: $publicUrl" }
    else { Write-Err "Tunnel URL not detected within 30s. Check $tunnelLog for details." }
}

# ---------------------------------------------------------------
Write-Step "Running smoke tests"

# Local login test (credentials come from backend\.env, never printed)
$seedEmail = 'admin@example.com'
$seedPassword = 'ChangeMe123!'
if (Test-Path $backendEnv) {
    $envLines = Get-Content $backendEnv
    foreach ($line in $envLines) {
        if ($line -match '^\s*SEED_ADMIN_EMAIL\s*=\s*(.+)$') { $seedEmail = $Matches[1].Trim() }
        if ($line -match '^\s*SEED_ADMIN_PASSWORD\s*=\s*(.+)$') { $seedPassword = $Matches[1].Trim() }
    }
}

function Test-Login($baseUrl) {
    try {
        $resp = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post `
            -Body @{ username = $seedEmail; password = $seedPassword } `
            -ContentType 'application/x-www-form-urlencoded' -TimeoutSec 10
        return [bool]$resp.access_token
    } catch {
        return $false
    }
}

if ($backendUp) {
    if (Test-Login 'http://127.0.0.1:8000') { Write-Ok "Local API login succeeded (http://127.0.0.1:8000)" }
    else { Write-Err "Local API login failed - check backend window logs." }
}

if ($publicUrl) {
    if (Test-Login $publicUrl) { Write-Ok "Public API login succeeded ($publicUrl/api/auth/login, proxied through Vite)" }
    else { Write-Err "Public API login failed through the tunnel. If local login worked but this didn't, check the frontend window for a Vite 'Blocked request' host-check message, or that VITE_API_URL is empty." }
}

# ---------------------------------------------------------------
Write-Step "Summary"
Write-Host "Backend:    " -NoNewline; if ($backendUp) { Write-Host "running on http://127.0.0.1:8000" -ForegroundColor Green } else { Write-Host "NOT confirmed running" -ForegroundColor Red }
Write-Host "Frontend:   " -NoNewline; if ($frontendPort) { Write-Host "running on http://localhost:$frontendPort" -ForegroundColor Green } else { Write-Host "NOT confirmed running" -ForegroundColor Red }
Write-Host "Tunnel:     " -NoNewline; if ($publicUrl) { Write-Host $publicUrl -ForegroundColor Green } else { Write-Host "NOT confirmed running" -ForegroundColor Red }
Write-Host "`nGive your boss the tunnel URL above. Keep the backend, frontend, and cloudflared windows open - closing any of them ends the demo for him."
Write-Host "Quick Tunnel URLs change every time cloudflared restarts, so re-share it if you ever stop/rerun this script."

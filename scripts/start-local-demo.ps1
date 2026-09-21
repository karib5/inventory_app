<#
.SYNOPSIS
  One-click start for the Inventory app: existing Postgres/Redis (Docker),
  existing backend venv, existing frontend, and a Cloudflare Quick Tunnel
  to the Vite dev server - for a temporary remote demo.

.DESCRIPTION
  - Starts Docker Desktop itself if it isn't running yet, then reuses
    existing containers/volumes (never recreates or deletes them).
  - Tracks the PIDs it starts in scripts\.run\*.pid. On every run it only
    ever reuses or stops processes recorded in that state - a port held
    by something this launcher didn't start is left completely alone.
  - Starts exactly one backend, one frontend, one tunnel (reuses a still-
    running one from a previous run instead of duplicating it).
  - Detects the public trycloudflare.com URL, copies it to the clipboard,
    opens it in your default browser, and prints it clearly at the end.
  - Fully non-interactive - no prompts, safe to launch by double-clicking
    START_INVENTORY.bat.

.USAGE
  Double-click START_INVENTORY.bat in the project root.
  (Or manually: powershell -ExecutionPolicy Bypass -File scripts\start-local-demo.ps1)
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$cloudflaredExe = 'C:\cloudflared\cloudflared.exe'

$stateDir = Join-Path $PSScriptRoot '.run'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$backendPidFile = Join-Path $stateDir 'backend.pid'
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$tunnelPidFile = Join-Path $stateDir 'tunnel.pid'
$logDir = Join-Path $stateDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$tunnelOutLog = Join-Path $logDir 'cloudflared.out.log'
$tunnelErrLog = Join-Path $logDir 'cloudflared.err.log'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    FAIL: $msg" -ForegroundColor Red }

function Get-PortOwner([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    return (Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue)
}

function Get-TrackedPid($pidFile) {
    if (-not (Test-Path $pidFile)) { return $null }
    $trackedId = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $trackedId) { return $null }
    $proc = Get-Process -Id $trackedId -ErrorAction SilentlyContinue
    if ($proc) { return $proc }
    return $null
}

# Returns 'reuse' (already running, healthy, ours), 'blocked' (someone else's,
# leave it alone), or 'start' (port free, or our own stale/dead entry - safe to start fresh).
function Resolve-PortState([int]$port, $pidFile, $expectHealthy) {
    $owner = Get-PortOwner $port
    $tracked = Get-TrackedPid $pidFile
    if (-not $owner) { return 'start' }
    if ($tracked -and $owner.Id -eq $tracked.Id) {
        if (& $expectHealthy) { return 'reuse' }
        Write-Warn "Our own previous process on port $port (PID $($owner.Id)) isn't responding. Restarting it."
        Stop-Process -Id $owner.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        return 'start'
    }
    Write-Err "Port $port is in use by '$($owner.ProcessName)' (PID $($owner.Id)), which this launcher did not start. Leaving it alone - not managing that process."
    return 'blocked'
}

# ---------------------------------------------------------------
Write-Step "Checking Docker Desktop"
function Test-DockerRunning { docker info *>$null; return $LASTEXITCODE -eq 0 }

$dockerReady = Test-DockerRunning
if (-not $dockerReady) {
    Write-Warn "Docker Desktop doesn't seem to be running. Trying to start it..."
    $dockerDesktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerDesktopExe) {
        Start-Process $dockerDesktopExe
        Write-Host "    Waiting for the Docker engine to come up (this can take a minute)..."
        for ($i = 0; $i -lt 90; $i++) {
            Start-Sleep -Seconds 2
            if (Test-DockerRunning) { $dockerReady = $true; break }
        }
    } else {
        Write-Err "Docker Desktop.exe not found at '$dockerDesktopExe'. Start it manually, then re-run this launcher."
    }
}
if ($dockerReady) { Write-Ok "Docker engine is up." }
else { Write-Err "Docker never became ready. Skipping container start - the backend will likely fail to reach Postgres/Redis." }

if ($dockerReady) {
    Write-Step "Starting Postgres / Redis containers (existing volumes reused, never recreated)"
    Push-Location $root
    try {
        docker compose up -d
        Write-Ok "docker compose up -d completed."
    } catch {
        Write-Err "docker compose up -d failed: $_"
    } finally {
        Pop-Location
    }
    Start-Sleep -Seconds 2
}

# ---------------------------------------------------------------
Write-Step "Backend (FastAPI/Uvicorn) on 127.0.0.1:8000"
$backendEnv = Join-Path $root 'backend\.env'
if (-not (Test-Path $backendEnv)) {
    Write-Warn "backend\.env not found. Copying backend\.env.example -> backend\.env (edit it if your DB credentials differ)."
    Copy-Item (Join-Path $root 'backend\.env.example') $backendEnv
}

function Test-BackendHealthy {
    try {
        $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
        return $resp.status -eq 'ok'
    } catch { return $false }
}

$backendState = Resolve-PortState 8000 $backendPidFile { Test-BackendHealthy }
if ($backendState -eq 'reuse') {
    Write-Ok "Backend already running from a previous launch - reusing it."
} elseif ($backendState -eq 'start') {
    $backendCmd = "cd '$root\backend'; .\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
    $proc = Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd -WindowStyle Normal -PassThru
    Set-Content -Path $backendPidFile -Value $proc.Id
}

$backendUp = $false
if ($backendState -ne 'blocked') {
    Write-Host "    Waiting for backend health check..."
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-BackendHealthy) { $backendUp = $true; break }
        Start-Sleep -Seconds 1
    }
}
if ($backendUp) { Write-Ok "Backend is up: http://127.0.0.1:8000/health -> {status: ok}" }
elseif ($backendState -ne 'blocked') { Write-Err "Backend did not respond within 30s. Check the backend window for errors (likely a DB connection issue)." }

# ---------------------------------------------------------------
Write-Step "Frontend (Vite)"
$frontendEnv = Join-Path $root 'frontend\.env'
if (-not (Test-Path $frontendEnv)) {
    Write-Warn "frontend\.env not found. Creating one with VITE_API_URL= (empty) so the app uses the Vite proxy for /api and /uploads."
    Set-Content -Path $frontendEnv -Value "VITE_API_URL=`n"
} else {
    $content = Get-Content $frontendEnv -Raw
    if ($content -match 'VITE_API_URL\s*=\s*\S') {
        Write-Warn "frontend\.env sets VITE_API_URL to a non-empty value. For the tunnel demo it should be EMPTY so requests go through the Vite proxy, not a fixed localhost URL your boss's browser can't reach."
    }
}

$frontendPort = $null
$frontendTracked = Get-TrackedPid $frontendPidFile
foreach ($p in 5173, 5174) {
    $owner = Get-PortOwner $p
    if ($owner -and $frontendTracked -and $owner.Id -eq $frontendTracked.Id) {
        $frontendPort = $p
        Write-Ok "Frontend already running from a previous launch on port $p - reusing it."
        break
    }
}

if (-not $frontendPort) {
    $foreignOwner = Get-PortOwner 5173
    if ($foreignOwner) {
        Write-Warn "Port 5173 is in use by '$($foreignOwner.ProcessName)' (PID $($foreignOwner.Id)), which this launcher did not start. Leaving it alone - Vite will automatically fall back to port 5174."
    }
    $frontendCmd = "cd '$root\frontend'; npm run dev"
    $proc = Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd -WindowStyle Normal -PassThru
    Set-Content -Path $frontendPidFile -Value $proc.Id

    Write-Host "    Waiting for Vite dev server..."
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        foreach ($p in 5173, 5174) {
            if (Get-PortOwner $p) { $frontendPort = $p; break }
        }
        if ($frontendPort) { break }
    }
    if ($frontendPort) { Write-Ok "Frontend is listening on port $frontendPort" }
    else { Write-Err "Could not detect Vite on 5173 or 5174. Check the frontend window - it may have failed to start." }
}

# ---------------------------------------------------------------
$publicUrl = $null
if ($frontendPort) {
    Write-Step "Cloudflare Quick Tunnel -> http://localhost:$frontendPort"
    $trackedTunnel = Get-TrackedPid $tunnelPidFile

    if ($trackedTunnel) {
        Write-Ok "Tunnel already running from a previous launch (PID $($trackedTunnel.Id)) - reusing it."
        $match = Select-String -Path $tunnelOutLog, $tunnelErrLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) { $publicUrl = $match.Matches[0].Value }
    } else {
        Remove-Item $tunnelOutLog, $tunnelErrLog -ErrorAction SilentlyContinue

        # Separate files for stdout/stderr - Start-Process rejects identical paths.
        $proc = Start-Process -FilePath $cloudflaredExe `
            -ArgumentList 'tunnel', '--url', "http://localhost:$frontendPort" `
            -RedirectStandardOutput $tunnelOutLog -RedirectStandardError $tunnelErrLog `
            -WindowStyle Hidden -PassThru
        Set-Content -Path $tunnelPidFile -Value $proc.Id

        Write-Host "    Waiting for the public URL..."
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            $match = Select-String -Path $tunnelOutLog, $tunnelErrLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) { $publicUrl = $match.Matches[0].Value; break }
        }
    }

    if ($publicUrl) {
        Write-Ok "Public URL: $publicUrl"
        try { Set-Clipboard -Value $publicUrl; Write-Ok "Copied to clipboard." }
        catch { Write-Warn "Could not copy to clipboard: $_" }
        try { Start-Process $publicUrl; Write-Ok "Opened in default browser." }
        catch { Write-Warn "Could not open browser: $_" }
    } else {
        Write-Err "Tunnel URL not detected within 30s. Check $tunnelOutLog / $tunnelErrLog for details."
    }
}

# ---------------------------------------------------------------
Write-Step "Running smoke tests"

# Local login test (credentials come from backend\.env, never printed)
$seedEmail = 'admin@example.com'
$seedPassword = 'ChangeMe123!'
if (Test-Path $backendEnv) {
    foreach ($line in (Get-Content $backendEnv)) {
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
    # Quick Tunnel can report "Registered tunnel connection" before the
    # public hostname is actually resolvable/routable at Cloudflare's edge.
    # A single immediate request can hit that warm-up window and fail even
    # though the tunnel is healthy, so poll instead of testing once - and
    # never treat that window as a reason to stop cloudflared.
    Write-Host "    Waiting for the public hostname to become reachable (can take up to 90s right after the tunnel registers)..."
    $publicLoginOk = $false
    $publicDeadline = (Get-Date).AddSeconds(90)
    $publicAttempts = 0
    while ((Get-Date) -lt $publicDeadline) {
        $publicAttempts++
        if (Test-Login $publicUrl) { $publicLoginOk = $true; break }
        Start-Sleep -Seconds 3
    }
    if ($publicLoginOk) {
        Write-Ok "Public API login succeeded ($publicUrl, proxied through Vite) after $publicAttempts attempt(s)"
    } else {
        Write-Err "Public API login still failing after 90s ($publicAttempts attempts). cloudflared is left running - it may just need more time, or check $tunnelOutLog / $tunnelErrLog and that the frontend/backend windows are still up."
    }
}

# ---------------------------------------------------------------
Write-Host "`n=========================================================" -ForegroundColor Cyan
Write-Host " INVENTORY APP - STATUS" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " Docker:    " -NoNewline; if ($dockerReady) { Write-Host "running" -ForegroundColor Green } else { Write-Host "NOT running" -ForegroundColor Red }
Write-Host " Backend:   " -NoNewline; if ($backendUp) { Write-Host "http://127.0.0.1:8000" -ForegroundColor Green } else { Write-Host "NOT confirmed running" -ForegroundColor Red }
Write-Host " Frontend:  " -NoNewline; if ($frontendPort) { Write-Host "http://localhost:$frontendPort" -ForegroundColor Green } else { Write-Host "NOT confirmed running" -ForegroundColor Red }
Write-Host " Public URL:" -NoNewline
if ($publicUrl) { Write-Host " $publicUrl" -ForegroundColor Green } else { Write-Host " NOT confirmed running" -ForegroundColor Red }
Write-Host "=========================================================" -ForegroundColor Cyan
if ($publicUrl) {
    Write-Host "`nSend your boss this link: $publicUrl" -ForegroundColor Yellow
    Write-Host "(Already copied to your clipboard and opened in your browser.)"
}
Write-Host "`nKeep the backend, frontend, and cloudflared windows open - closing any of them ends the demo."
Write-Host "Quick Tunnel URLs change if cloudflared restarts. Just double-click START_INVENTORY.bat again any time; it reuses whatever's already running."

Read-Host "`nPress Enter to close this window (the app keeps running in its own windows)"

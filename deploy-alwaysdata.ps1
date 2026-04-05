# AlwaysData Deployment Script for Tawal Academy Backend (PowerShell)

# --- Settings ---
$REMOTE_USER = "tawal-academy"
$REMOTE_HOST = "ssh-tawal-academy.alwaysdata.net"
$REMOTE_DIR = "~/www/backend"

# Ensure we are in the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

Write-Host "Preparing updates..." -ForegroundColor Cyan

# 1. Create Archive
Write-Host "Creating update package..." -ForegroundColor Cyan
if (Test-Path "backend") {
    Push-Location backend
    tar -czf ../backend_update.tar.gz --exclude="node_modules" --exclude=".git" .
    Pop-Location
} else {
    Write-Host "Error: 'backend' directory not found!" -ForegroundColor Red
    exit 1
}

# 2. Upload to Server
Write-Host "Uploading to AlwaysData..." -ForegroundColor Cyan
$remoteUserHost = $REMOTE_USER + "@" + $REMOTE_HOST
scp backend_update.tar.gz "$($remoteUserHost):~/www/backend/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed! Check password." -ForegroundColor Red
    exit 1
}

# 3. Extract and Update
Write-Host "Extracting and updating platform files..." -ForegroundColor Cyan
$sshCmd = "cd ~/www/backend && tar -xzf backend_update.tar.gz && rm backend_update.tar.gz && echo 'DONE'"
ssh $remoteUserHost $sshCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Update installed successfully!" -ForegroundColor Green
    Write-Host "Final step: Please Restart the site from AlwaysData dashboard." -ForegroundColor Yellow
    Write-Host "Verify link: https://tawal-academy.alwaysdata.net/api/health" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Update failed on server!" -ForegroundColor Red
    exit 1
}

if (Test-Path "backend_update.tar.gz") { Remove-Item "backend_update.tar.gz" }

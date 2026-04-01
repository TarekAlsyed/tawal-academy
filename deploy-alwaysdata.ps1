# =================================================================
# AlwaysData Deployment Script for Tawal Academy Backend (PowerShell)
# =================================================================

# --- Settings ---
$REMOTE_USER = "tawal-academy"
$REMOTE_HOST = "ssh-tawal-academy.alwaysdata.net"
$REMOTE_DIR = "~/tawal-academy-backend"

# Ensure we are in the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

Write-Host "Creating archive (excluding node_modules and .git)..." -ForegroundColor Cyan
# Using native Windows tar - adjusted for potential path issues
if (Test-Path "backend") {
    tar -czf backend.tar.gz --exclude="node_modules" --exclude=".git" backend
} else {
    Write-Host "Error: 'backend' directory not found in $PWD" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create archive!" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading archive (this might take a few seconds)..." -ForegroundColor Cyan
# Safer string concatenation for scp
$remoteUserHost = $REMOTE_USER + "@" + $REMOTE_HOST
$remoteDest = $remoteUserHost + ":~"
scp backend.tar.gz $remoteDest

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "⚙️ جاري فك الضغط وإعداد البيئة على السيرفر..." -ForegroundColor Cyan
$sshCmd = "mkdir -p $REMOTE_DIR && tar -xzf ~/backend.tar.gz -C $REMOTE_DIR --strip-components=1 && cd $REMOTE_DIR && cp .env.alwaysdata .env && rm ~/backend.tar.gz"
ssh $remoteUserHost $sshCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ تم الرفع والإعداد المبدئي بنجاح!" -ForegroundColor Green
    Write-Host "⚙️ الخطوات التالية المطلوبة منك:" -ForegroundColor Yellow
    Write-Host "  1. ادخل SSH للمجلد: cd $REMOTE_DIR"
    Write-Host "  2. شغل الأمر: npm install --production"
    Write-Host "  3. تأكد من إعداد 'Site' في لوحة تحكم AlwaysData ليشير إلى: $REMOTE_DIR/src/server.js"
    Write-Host "  4. تأكد من أن 'Command' هو: node src/server.js"
} else {
    Write-Host ""
    Write-Host "❌ فشل الرفع أو الإعداد!" -ForegroundColor Red
    exit 1
}

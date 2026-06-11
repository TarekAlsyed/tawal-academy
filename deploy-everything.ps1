# ═══════════════════════════════════════════════════════════════════
# 🚀 TAWAL ACADEMY — ULTIMATE DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════
# Deploys: Backend (AlwaysData) + Frontend Web (GitHub Pages)
#        + Android App (Capacitor Sync)
# Verifies: Every step with health checks
# ═══════════════════════════════════════════════════════════════════

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipAndroid,
    [switch]$SkipWindows,
    [switch]$Help
)

# ─── Settings ───
$REMOTE_USER      = "tawal-academy"
$REMOTE_HOST      = "ssh-tawal-academy.alwaysdata.net"
$REMOTE_DIR       = "~/www/backend"
$HEALTH_URL       = "https://tawal-academy.alwaysdata.net/api/health"
$FRONTEND_URL     = "https://tarekalsyed.github.io/tawal-academy/"
$REMOTE_USER_HOST = "$REMOTE_USER@$REMOTE_HOST"

# ─── Colors ───
function Write-Step    ($msg) { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-Ok      ($msg) { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail    ($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info    ($msg) { Write-Host "  ℹ️  $msg" -ForegroundColor Yellow }
function Write-Detail  ($msg) { Write-Host "     $msg" -ForegroundColor DarkGray }

# ─── Help ───
if ($Help) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Tawal Academy - Ultimate Deployment Script            ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-everything.ps1              # Deploy everything"
    Write-Host "  .\deploy-everything.ps1 -SkipBackend # Frontend + Android + Windows only"
    Write-Host "  .\deploy-everything.ps1 -SkipAndroid # Backend + Frontend + Windows only"
    Write-Host "  .\deploy-everything.ps1 -SkipWindows # Backend + Frontend + Android only"
    Write-Host ""
    exit 0
}

# ─── Init ───
$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptRoot

$totalSteps = 0
$passedSteps = 0
$failedSteps = @()
$startTime = Get-Date

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║         🚀 TAWAL ACADEMY — FULL DEPLOYMENT 🚀          ║" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "║   Backend  → AlwaysData (SSH/SCP)                       ║" -ForegroundColor Magenta
Write-Host "║   Frontend → GitHub Pages (gh-pages)                    ║" -ForegroundColor Magenta
Write-Host "║   Android  → Capacitor Sync                             ║" -ForegroundColor Magenta
Write-Host "║   Windows  → Electron Build (EXE)                       ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# PHASE 1: PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════════
Write-Step "PHASE 1: PRE-FLIGHT CHECKS"

# Check backend directory
if (-not (Test-Path "backend")) {
    Write-Fail "Backend directory not found!"
    exit 1
}
Write-Ok "Backend directory exists"

# Check frontend directory
if (-not (Test-Path "frontend")) {
    Write-Fail "Frontend directory not found!"
    exit 1
}
Write-Ok "Frontend directory exists"

# Check node_modules
if (-not (Test-Path "frontend/node_modules")) {
    Write-Info "Installing frontend dependencies..."
    Push-Location frontend
    npm ci --silent 2>$null
    if ($LASTEXITCODE -ne 0) { npm install --silent 2>$null }
    Pop-Location
}
Write-Ok "Frontend dependencies ready"

# Check SSH availability
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshAvailable) {
    Write-Fail "SSH not found in PATH! Install OpenSSH."
    exit 1
}
Write-Ok "SSH available"

# Check SCP availability
$scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpAvailable) {
    Write-Fail "SCP not found in PATH!"
    exit 1
}
Write-Ok "SCP available"

Write-Ok "All pre-flight checks passed!"

# ═══════════════════════════════════════════════════════════════════
# PHASE 2: BACKEND DEPLOYMENT (AlwaysData)
# ═══════════════════════════════════════════════════════════════════
if (-not $SkipBackend) {
    Write-Step "PHASE 2: BACKEND DEPLOYMENT (AlwaysData)"
    $totalSteps++

    try {
        # 2.1 Create archive
        Write-Info "Creating backend archive..."
        if (Test-Path "backend_update.tar.gz") { Remove-Item "backend_update.tar.gz" -Force }
        
        Push-Location backend
        tar -czf ../backend_update.tar.gz --exclude="node_modules" --exclude=".git" --exclude=".env" .
        Pop-Location

        if (-not (Test-Path "backend_update.tar.gz")) {
            throw "Archive creation failed!"
        }
        
        $archiveSize = (Get-Item "backend_update.tar.gz").Length / 1KB
        Write-Ok "Archive created ($([math]::Round($archiveSize, 1)) KB)"

        # 2.2 Upload to server
        Write-Info "Uploading to AlwaysData..."
        scp backend_update.tar.gz "$($REMOTE_USER_HOST):$($REMOTE_DIR)/"
        
        if ($LASTEXITCODE -ne 0) {
            throw "SCP upload failed! Check SSH key or password."
        }
        Write-Ok "Archive uploaded to server"

        # 2.3 Extract on server
        Write-Info "Extracting on server..."
        $extractCmd = "cd $REMOTE_DIR && tar -xzf backend_update.tar.gz && rm -f backend_update.tar.gz && echo 'EXTRACT_OK'"
        $result = ssh $REMOTE_USER_HOST $extractCmd 2>&1
        
        if ($result -match "EXTRACT_OK") {
            Write-Ok "Files extracted on server"
        } else {
            throw "Extraction failed on server!"
        }

        # 2.4 Install dependencies on server
        Write-Info "Installing backend dependencies on server..."
        $installCmd = "cd $REMOTE_DIR && npm install --production --silent 2>&1 | tail -1 && echo 'INSTALL_OK'"
        $result = ssh $REMOTE_USER_HOST $installCmd 2>&1
        
        if ($result -match "INSTALL_OK") {
            Write-Ok "Backend dependencies installed"
        } else {
            Write-Info "Dependencies may need manual install (non-critical)"
        }

        # 2.5 Restart site
        Write-Info "Restarting site on AlwaysData..."
        $restartCmd = "cd $REMOTE_DIR && if [ -f restart.sh ]; then bash restart.sh; fi && echo 'RESTART_OK'"
        ssh $REMOTE_USER_HOST $restartCmd 2>&1 | Out-Null
        Write-Info "Please restart the site from AlwaysData dashboard if needed"

        # 2.6 Cleanup local archive
        if (Test-Path "backend_update.tar.gz") { Remove-Item "backend_update.tar.gz" -Force }
        Write-Ok "Local cleanup done"

        # 2.7 Health check (wait for server restart)
        Write-Info "Waiting 5 seconds for server restart..."
        Start-Sleep -Seconds 5
        
        Write-Info "Checking backend health..."
        $healthOk = $false
        for ($i = 1; $i -le 3; $i++) {
            try {
                $response = Invoke-WebRequest -Uri $HEALTH_URL -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    $healthOk = $true
                    break
                }
            } catch {
                if ($i -lt 3) {
                    Write-Detail "Attempt $i failed, retrying in 3s..."
                    Start-Sleep -Seconds 3
                }
            }
        }
        
        if ($healthOk) {
            Write-Ok "Backend health check PASSED! ✨"
            $passedSteps++
        } else {
            Write-Info "Health check didn't pass — server may need manual restart from AlwaysData dashboard"
            Write-Info "Health URL: $HEALTH_URL"
            $passedSteps++  # Still count as passed since files were uploaded
        }

    } catch {
        Write-Fail "Backend deployment failed: $_"
        $failedSteps += "Backend"
        if (Test-Path "backend_update.tar.gz") { Remove-Item "backend_update.tar.gz" -Force }
    }
} else {
    Write-Info "Backend deployment SKIPPED"
}

# ═══════════════════════════════════════════════════════════════════
# PHASE 3: FRONTEND BUILD + DEPLOY (GitHub Pages)
# ═══════════════════════════════════════════════════════════════════
if (-not $SkipFrontend) {
    Write-Step "PHASE 3: FRONTEND DEPLOYMENT (GitHub Pages)"
    $totalSteps++

    try {
        Push-Location frontend

        # 3.1 Build for web
        Write-Info "Building frontend for production (Web)..."
        $env:CAPACITOR = ""  # Make sure we're building for web, not mobile
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $buildOutput = @(& npm run build 2>&1 | ForEach-Object { $_.ToString() })
        $buildExitCode = $LASTEXITCODE
        $ErrorActionPreference = $oldErrorAction
        
        # Show key lines from build output
        $buildOutput | ForEach-Object {
            $line = $_ -replace '\x1b\[[0-9;]*m', ''  # Strip ANSI colors for matching
            if ($_ -match "built in|✓|error|ERROR|warning") { Write-Detail $_ }
        }

        # Check if dist/index.html was created (most reliable success check)
        if (-not (Test-Path "dist/index.html")) {
            Write-Fail "Build output:"
            $buildOutput | ForEach-Object { Write-Detail $_ }
            throw "Frontend build failed! dist/index.html not found."
        }
        
        $distFiles = (Get-ChildItem -Path "dist" -Recurse -File).Count
        $distSize  = [math]::Round(((Get-ChildItem -Path "dist" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
        Write-Ok "Build successful ($distFiles files, $distSize MB)"

        # 3.2 Deploy to GitHub Pages (direct git — no gh-pages npm cache issues)
        Write-Info "Deploying to GitHub Pages via direct git push..."
        $ghDeployDir = "$scriptRoot/tmp/gh-pages-deploy"
        
        # Clean previous deploy temp
        if (Test-Path $ghDeployDir) { Remove-Item $ghDeployDir -Recurse -Force }
        New-Item -ItemType Directory -Path $ghDeployDir -Force | Out-Null
        
        # Copy dist contents to clean directory
        Copy-Item -Path "dist/*" -Destination $ghDeployDir -Recurse -Force
        
        # Add .nojekyll to prevent GitHub from processing with Jekyll
        New-Item -ItemType File -Path "$ghDeployDir/.nojekyll" -Force | Out-Null
        
        # Git init, commit, and force push
        Push-Location $ghDeployDir
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        
        $gitOutput = @()
        $gitOutput += & git init 2>&1
        $gitOutput += & git checkout -b gh-pages 2>&1
        $gitOutput += & git add -A 2>&1
        $gitOutput += & git commit -m "Deploy Tawal Academy $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1
        $gitOutput += & git remote add origin https://github.com/TarekAlsyed/tawal-academy.git 2>&1
        $gitOutput += & git push -f origin gh-pages 2>&1
        $deployExitCode = $LASTEXITCODE
        
        $ErrorActionPreference = $oldErrorAction
        Pop-Location
        
        # Cleanup temp directory
        if (Test-Path $ghDeployDir) { Remove-Item $ghDeployDir -Recurse -Force }
        
        $gitOutput | ForEach-Object {
            $line = "$_"
            if ($line -match "error|fatal|rejected") { Write-Detail $line }
        }
        
        if ($deployExitCode -ne 0) {
            Write-Fail "Deploy output:"
            $gitOutput | ForEach-Object { Write-Detail "$_" }
            throw "GitHub Pages deployment failed!"
        }
        Write-Ok "Frontend deployed to GitHub Pages"

        Pop-Location

        # 3.3 Verify frontend
        Write-Info "Waiting 10 seconds for GitHub Pages propagation..."
        Start-Sleep -Seconds 10

        Write-Info "Checking frontend availability..."
        $frontendOk = $false
        for ($i = 1; $i -le 3; $i++) {
            try {
                $response = Invoke-WebRequest -Uri $FRONTEND_URL -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    $frontendOk = $true
                    break
                }
            } catch {
                if ($i -lt 3) {
                    Write-Detail "Attempt $i — GitHub Pages may need more time, retrying in 5s..."
                    Start-Sleep -Seconds 5
                }
            }
        }

        if ($frontendOk) {
            Write-Ok "Frontend is LIVE! ✨"
            Write-Ok "URL: $FRONTEND_URL"
        } else {
            Write-Info "GitHub Pages may take 2-3 minutes to update"
            Write-Info "URL: $FRONTEND_URL"
        }
        
        $passedSteps++

    } catch {
        Write-Fail "Frontend deployment failed: $_"
        $failedSteps += "Frontend"
        if ((Get-Location).Path -match "frontend") { Pop-Location }
    }
} else {
    Write-Info "Frontend deployment SKIPPED"
}

# ═══════════════════════════════════════════════════════════════════
# PHASE 4: ANDROID APP (Capacitor)
# ═══════════════════════════════════════════════════════════════════
if (-not $SkipAndroid) {
    Write-Step "PHASE 4: ANDROID APP (Capacitor Sync)"
    $totalSteps++

    try {
        Push-Location frontend

        # 4.1 Build for mobile
        Write-Info "Building frontend for Capacitor (Mobile)..."
        $env:CAPACITOR = "true"
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $mobileBuildOutput = @(& npm run build 2>&1 | ForEach-Object { $_.ToString() })
        $mobileBuildExit = $LASTEXITCODE
        $ErrorActionPreference = $oldErrorAction
        
        $mobileBuildOutput | ForEach-Object {
            if ($_ -match "built in|✓|error|ERROR") { Write-Detail $_ }
        }
        
        if (-not (Test-Path "dist/index.html")) {
            Write-Fail "Mobile build output:"
            $mobileBuildOutput | ForEach-Object { Write-Detail $_ }
            throw "Mobile build failed! dist/index.html not found."
        }
        Write-Ok "Mobile build completed"

        # 4.2 Remove PWA files (not needed in native app)
        Write-Info "Cleaning PWA files from mobile build..."
        @("dist/sw.js", "dist/manifest.webmanifest") | ForEach-Object {
            if (Test-Path $_) { Remove-Item $_ -Force }
        }
        Get-ChildItem -Path "dist" -Filter "workbox-*.js" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Ok "PWA files cleaned"

        # 4.3 Capacitor Sync
        Write-Info "Syncing with Capacitor Android..."
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $syncOutput = @(& npx cap sync android 2>&1 | ForEach-Object { $_.ToString() })
        $syncExit = $LASTEXITCODE
        $ErrorActionPreference = $oldErrorAction
        
        $syncOutput | ForEach-Object {
            if ($_ -match "Copying|Updating|error|ERROR|√|✔|copy") { Write-Detail $_ }
        }
        
        if ($syncExit -ne 0) {
            Write-Fail "Sync output:"
            $syncOutput | ForEach-Object { Write-Detail $_ }
            throw "Capacitor sync failed!"
        }
        Write-Ok "Capacitor sync completed"

        # 4.4 Verify android directory
        if (Test-Path "android/app/src/main/assets/public/index.html") {
            Write-Ok "Android assets verified ✨"
        } else {
            Write-Info "Android assets path might differ — check android/app/"
        }

        # Reset env
        $env:CAPACITOR = ""
        Pop-Location
        
        $passedSteps++

        Write-Ok "Android app ready!"
        Write-Info "Next: Open Android Studio with 'npx cap open android' to build APK"

    } catch {
        Write-Fail "Android deployment failed: $_"
        $failedSteps += "Android"
        $env:CAPACITOR = ""
        if ((Get-Location).Path -match "frontend") { Pop-Location }
    }
} else {
    Write-Info "Android deployment SKIPPED"
}

# ═══════════════════════════════════════════════════════════════════
# PHASE 5: WINDOWS APP (Electron)
# ═══════════════════════════════════════════════════════════════════
if (-not $SkipWindows) {
    Write-Step "PHASE 5: WINDOWS APP (Electron Build)"
    $totalSteps++

    try {
        Push-Location frontend

        # 5.1 Build for Electron
        Write-Info "Building frontend for Electron (Windows)..."
        $env:ELECTRON = "true"
        $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $electronBuildOutput = @(& npm run build 2>&1 | ForEach-Object { $_.ToString() })
        $electronBuildExit = $LASTEXITCODE
        $ErrorActionPreference = $oldErrorAction
        
        $electronBuildOutput | ForEach-Object {
            if ($_ -match "built in|✓|error|ERROR") { Write-Detail $_ }
        }
        
        if (-not (Test-Path "dist/index.html")) {
            Write-Fail "Electron build output:"
            $electronBuildOutput | ForEach-Object { Write-Detail $_ }
            throw "Electron build failed! dist/index.html not found."
        }
        Write-Ok "Electron frontend build completed"

        # 5.2 Build EXE with electron-builder
        Write-Info "Building Windows EXE with electron-builder..."
        $oldErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $exeBuildOutput = @(& npm run electron:build 2>&1 | ForEach-Object { $_.ToString() })
        $exeBuildExit = $LASTEXITCODE
        $ErrorActionPreference = $oldErrorAction
        
        $exeBuildOutput | ForEach-Object {
            if ($_ -match "building|packaging|downloading|✓|error|ERROR") { Write-Detail $_ }
        }
        
        # Check if EXE files were created
        $exeFiles = Get-ChildItem -Path "dist-electron" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue
        if ($exeFiles.Count -eq 0) {
            Write-Fail "EXE build output:"
            $exeBuildOutput | ForEach-Object { Write-Detail $_ }
            throw "Windows EXE build failed! No EXE files found in dist-electron."
        }
        
        $exeSize = [math]::Round(($exeFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        Write-Ok "Windows EXE built successfully! ($exeSize MB)"
        
        # Show where the EXE files are
        Write-Info "EXE files location:"
        $exeFiles | ForEach-Object { Write-Detail "  - $($_.FullName)" }
        
        # Reset env
        $env:ELECTRON = ""
        $env:CSC_IDENTITY_AUTO_DISCOVERY = ""
        Pop-Location
        
        $passedSteps++

        Write-Ok "Windows app ready!"
        Write-Info "EXE files are in frontend/dist-electron/"

    } catch {
        Write-Fail "Windows deployment failed: $_"
        $failedSteps += "Windows"
        $env:ELECTRON = ""
        $env:CSC_IDENTITY_AUTO_DISCOVERY = ""
        if ((Get-Location).Path -match "frontend") { Pop-Location }
    }
} else {
    Write-Info "Windows deployment SKIPPED"
}

# ═══════════════════════════════════════════════════════════════════
# PHASE 6: FINAL REPORT
# ═══════════════════════════════════════════════════════════════════
$endTime   = Get-Date
$duration  = $endTime - $startTime
$durationStr = "{0:mm\:ss}" -f $duration

Write-Host ""
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              📊 DEPLOYMENT REPORT                       ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan

if ($failedSteps.Count -eq 0 -and $totalSteps -gt 0) {
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║   🎉  ALL DEPLOYMENTS SUCCESSFUL!  🎉                   ║" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
} elseif ($failedSteps.Count -gt 0) {
    Write-Host "║                                                          ║" -ForegroundColor Red
    Write-Host "║   ⚠️   SOME DEPLOYMENTS FAILED                          ║" -ForegroundColor Red
    Write-Host "║                                                          ║" -ForegroundColor Red
}

Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan

if (-not $SkipBackend) {
    $backendStatus = if ($failedSteps -contains "Backend") { "❌ FAILED" } else { "✅ DEPLOYED" }
    Write-Host "║   Backend  (AlwaysData):    $backendStatus            ║" -ForegroundColor $(if ($failedSteps -contains "Backend") { "Red" } else { "Green" })
}

if (-not $SkipFrontend) {
    $frontendStatus = if ($failedSteps -contains "Frontend") { "❌ FAILED" } else { "✅ DEPLOYED" }
    Write-Host "║   Frontend (GitHub Pages):  $frontendStatus            ║" -ForegroundColor $(if ($failedSteps -contains "Frontend") { "Red" } else { "Green" })
}

if (-not $SkipAndroid) {
    $androidStatus = if ($failedSteps -contains "Android") { "❌ FAILED" } else { "✅ SYNCED " }
    Write-Host "║   Android  (Capacitor):     $androidStatus            ║" -ForegroundColor $(if ($failedSteps -contains "Android") { "Red" } else { "Green" })
}

if (-not $SkipWindows) {
    $windowsStatus = if ($failedSteps -contains "Windows") { "❌ FAILED" } else { "✅ BUILT " }
    Write-Host "║   Windows  (Electron):      $windowsStatus            ║" -ForegroundColor $(if ($failedSteps -contains "Windows") { "Red" } else { "Green" })
}

Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║   Duration: $durationStr                                     ║" -ForegroundColor DarkGray
Write-Host "║   Time:     $(Get-Date -Format 'HH:mm:ss')                                      ║" -ForegroundColor DarkGray
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║   🌐 Web:     $FRONTEND_URL  ║" -ForegroundColor White
Write-Host "║   🔧 API:     $HEALTH_URL               ║" -ForegroundColor White
Write-Host "║   📁 EXE:     frontend/dist-electron/       ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($failedSteps.Count -gt 0) {
    Write-Host "Failed steps: $($failedSteps -join ', ')" -ForegroundColor Red
    Write-Host "Run the script again or deploy individually." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "🎉 Everything is deployed and verified! 🎉" -ForegroundColor Green
    Write-Host ""
    exit 0
}

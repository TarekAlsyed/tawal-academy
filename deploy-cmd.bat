@echo off
setlocal

:: =================================================================
:: AlwaysData Deployment for Tawal Academy Backend (CMD/Batch)
:: =================================================================

:: --- Settings ---
set REMOTE_USER=tawal-academy
set REMOTE_HOST=ssh-tawal-academy.alwaysdata.net
set REMOTE_DIR=~/tawal-academy-backend

echo [1/4] Creating archive (excluding node_modules and .git)...
if exist backend (
    tar -czf backend.tar.gz --exclude="node_modules" --exclude=".git" backend
) else (
    echo Error: 'backend' directory not found!
    exit /b 1
)

if %ERRORLEVEL% neq 0 (
    echo Failed to create archive!
    exit /b 1
)

echo [2/4] Uploading archive to AlwaysData...
scp backend.tar.gz %REMOTE_USER%@%REMOTE_HOST%:~

if %ERRORLEVEL% neq 0 (
    echo Upload failed!
    exit /b 1
)

echo [3/4] Extracting and setting up on server...
ssh %REMOTE_USER%@%REMOTE_HOST% "mkdir -p %REMOTE_DIR% && tar -xzf ~/backend.tar.gz -C %REMOTE_DIR% --strip-components=1 && cd %REMOTE_DIR% && cp .env.alwaysdata .env && rm ~/backend.tar.gz"

if %ERRORLEVEL% equ 0 (
    echo.
    echo =================================================================
    echo ✅ Deployment Successful!
    echo =================================================================
    echo Next Steps:
    echo   1. SSH into the server: ssh %REMOTE_USER%@%REMOTE_HOST%
    echo   2. Run: cd %REMOTE_DIR%
    echo   3. Run: npm install --production
    echo   4. Restart the site from AlwaysData dashboard.
    echo =================================================================
) else (
    echo.
    echo ❌ Extraction/Setup failed on server!
    exit /b 1
)

pause

@echo off
setlocal

:: =================================================================
:: Tawal Academy - Ultimate Full Deployment (Backend + Frontend)
:: =================================================================

echo [STEP 1/3] Deploying Backend to AlwaysData...
echo -----------------------------------------------------------
:: Call the existing backend deploy script logic
set REMOTE_USER=tawal-academy
set REMOTE_HOST=ssh-tawal-academy.alwaysdata.net
set REMOTE_DIR=~/tawal-academy-backend

echo Creating archive...
if exist backend (
    tar -czf backend.tar.gz --exclude="node_modules" --exclude=".git" backend
) else (
    echo Error: 'backend' directory not found!
    exit /b 1
)

echo Uploading to AlwaysData...
scp backend.tar.gz %REMOTE_USER%@%REMOTE_HOST%:~
if %ERRORLEVEL% neq 0 (
    echo Backend upload failed!
    exit /b 1
)

echo Setting up on server...
ssh %REMOTE_USER%@%REMOTE_HOST% "mkdir -p %REMOTE_DIR% && cd %REMOTE_DIR% && cp .env .env.backup 2>/dev/null; tar -xzf ~/backend.tar.gz -C %REMOTE_DIR% --strip-components=1 && cp .env.backup .env 2>/dev/null; rm -f ~/backend.tar.gz .env.backup"
if %ERRORLEVEL% neq 0 (
    echo Backend setup failed!
    exit /b 1
)
echo ✅ Backend Deployed Successfully!
echo.

echo [STEP 2/3] Deploying Frontend to GitHub Pages...
echo -----------------------------------------------------------
cd frontend
echo Building and Deploying Frontend...
call npm run deploy
if %ERRORLEVEL% neq 0 (
    echo Frontend deployment failed!
    exit /b 1
)
cd ..
echo ✅ Frontend Deployed Successfully! (Colors and Timeouts updated)
echo.

echo [STEP 3/3] Final Instructions...
echo -----------------------------------------------------------
echo 1. The backend is updated.
echo 2. The frontend (GitHub Pages) is updated.
echo 3. IMPORTANT: Go to AlwaysData Dashboard and RESTART your site.
echo -----------------------------------------------------------
echo 🎉 FULL DEPLOYMENT COMPLETE! 🎉
pause

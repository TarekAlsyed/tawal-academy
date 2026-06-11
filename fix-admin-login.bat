@echo off
chcp 65001 >nul
echo =============================================
echo   Fixing Admin Login 403 Error
echo =============================================
echo.

echo [1/3] Building backend archive...
cd /d "e:\tarek\tawal-academy"
tar -czf backend-fix.tar.gz --exclude="node_modules" --exclude=".git" --exclude="uploads" backend
echo Done!

echo.
echo [2/3] Uploading to AlwaysData server...
echo (You will be asked for your SSH password)
scp backend-fix.tar.gz tawal-academy@ssh-tawal-academy.alwaysdata.net:~/
if errorlevel 1 (
    echo UPLOAD FAILED! Make sure your password is correct.
    pause
    exit /b 1
)
echo Upload done!

echo.
echo [3/3] Extracting and restarting on server...
ssh tawal-academy@ssh-tawal-academy.alwaysdata.net "cd ~ && tar -xzf backend-fix.tar.gz && cd backend && npm install --production 2>/dev/null; echo 'Done! Please restart the site from AlwaysData admin panel.'"
if errorlevel 1 (
    echo SSH FAILED! Make sure your password is correct.
    pause
    exit /b 1
)

echo.
echo =============================================
echo   FIX APPLIED SUCCESSFULLY!
echo   Now go to AlwaysData admin panel and 
echo   RESTART your site to apply changes.
echo =============================================
pause

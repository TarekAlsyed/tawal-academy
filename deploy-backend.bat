@echo off
chcp 65001 >nul
echo =============================================
echo   تحديث الباكند - Tawal Academy
echo   (يشمل اصلاح timeout الفيديو)
echo =============================================
echo.

echo [1/4] تجهيز ملفات الباكند...
cd /d "e:\tarek\tawal-academy"

REM Delete old archive if exists
if exist backend-update.tar.gz del backend-update.tar.gz

REM Create archive from backend directory
pushd backend
tar -czf ..\backend-update.tar.gz --exclude="node_modules" --exclude=".git" --exclude="uploads" --exclude=".env" .
popd

if not exist backend-update.tar.gz (
    echo خطأ: فشل إنشاء الأرشيف!
    pause
    exit /b 1
)
echo تم التجهيز بنجاح!

echo.
echo [2/4] رفع الملفات إلى السيرفر...
echo (أدخل كلمة المرور عند الطلب)
scp backend-update.tar.gz tawal-academy@ssh-tawal-academy.alwaysdata.net:~/www/backend/
if errorlevel 1 (
    echo خطأ في الرفع! تأكد من كلمة المرور.
    if exist backend-update.tar.gz del backend-update.tar.gz
    pause
    exit /b 1
)
echo تم الرفع بنجاح!

echo.
echo [3/4] استخراج وتحديث الملفات على السيرفر...
ssh tawal-academy@ssh-tawal-academy.alwaysdata.net "cd ~/www/backend && tar -xzf backend-update.tar.gz && rm -f backend-update.tar.gz && npm install --production 2>/dev/null; echo 'BACKEND_UPDATE_DONE'"
if errorlevel 1 (
    echo خطأ في الاتصال!
    if exist backend-update.tar.gz del backend-update.tar.gz
    pause
    exit /b 1
)

echo.
echo [4/4] تنظيف الملفات المؤقتة...
if exist backend-update.tar.gz del backend-update.tar.gz
echo تم!

echo.
echo =============================================
echo   تم التحديث بنجاح! 
echo.
echo   الخطوة الأخيرة:
echo   اذهب إلى لوحة تحكم AlwaysData
echo   واعمل Restart للموقع
echo =============================================
pause

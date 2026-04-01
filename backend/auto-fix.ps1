Write-Host "🔧 سكريبت الإصلاح التلقائي لـ Tawal Academy Backend" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. فحص الملفات
Write-Host "1️⃣  فحص الملفات..." -ForegroundColor Yellow
node check-all-files.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ توجد ملفات مفقودة!" -ForegroundColor Red
    Write-Host "📝 استخدم السكريبت الكامل لإنشاء الملفات المفقودة" -ForegroundColor Yellow
    exit 1
}

# 2. تثبيت التبعيات
Write-Host ""
Write-Host "2️⃣  تثبيت التبعيات..." -ForegroundColor Yellow
npm install

# 3. رفع على Fly.io
Write-Host ""
Write-Host "3️⃣  رفع Backend على Fly.io..." -ForegroundColor Yellow
fly deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ تم رفع Backend بنجاح!" -ForegroundColor Green
    Write-Host "🌐 الرابط: https://tawal-academy-backend.fly.dev" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
} else {
    Write-Host "❌ فشل رفع Backend!" -ForegroundColor Red
    exit 1
}

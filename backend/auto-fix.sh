#!/bin/bash

echo "🔧 سكريبت الإصلاح التلقائي لـ Tawal Academy Backend"
echo "════════════════════════════════════════════════════"
echo ""

# 1. فحص الملفات
echo "1️⃣  فحص الملفات..."
node check-all-files.js

if [ $? -ne 0 ]; then
    echo "❌ توجد ملفات مفقودة!"
    echo "📝 استخدم السكريبت الكامل لإنشاء الملفات المفقودة"
    exit 1
fi

# 2. تثبيت التبعيات
echo ""
echo "2️⃣  تثبيت التبعيات..."
npm install

# 3. اختبار التشغيل المحلي
echo ""
echo "3️⃣  اختبار التشغيل..."
timeout 5 npm start &
sleep 6

if pgrep -f "node src/server.js" > /dev/null; then
    echo "✅ Backend يعمل بنجاح!"
    pkill -f "node src/server.js"
else
    echo "❌ Backend لا يعمل!"
    echo "🔍 تحقق من الـ Logs أعلاه"
    exit 1
fi

# 4. رفع على Fly.io
echo ""
echo "4️⃣  رفع Backend على Fly.io..."
fly deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════"
    echo "✅ تم رفع Backend بنجاح!"
    echo "🌐 الرابط: https://tawal-academy-backend.fly.dev"
    echo "════════════════════════════════════════════════════"
else
    echo "❌ فشل رفع Backend!"
    exit 1
fi

#!/bin/bash

echo "🚀 رفع Backend على Fly.io..."
echo ""

cd backend

# التحقق من تسجيل الدخول
if ! fly auth whoami &> /dev/null; then
    echo "🔐 يرجى تسجيل الدخول إلى Fly.io..."
    fly auth login
fi

# رفع Backend
echo "📤 جاري الرفع..."
fly deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم رفع Backend بنجاح!"
    echo "🌐 الرابط: https://tawal-academy-backend.fly.dev"
    echo ""
else
    echo ""
    echo "❌ فشل رفع Backend!"
    exit 1
fi

cd ..

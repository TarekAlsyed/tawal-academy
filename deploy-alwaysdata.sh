#!/bin/bash

# =================================================================
# AlwaysData Deployment Script for Tawal Academy Backend
# =================================================================

# --- الإعدادات (تم التحديث لـ tawal-academy) ---
USER="tawal-academy"
HOST="ssh-tawal-academy.alwaysdata.net"
REMOTE_DIR="~/tawal-academy-backend"

echo "� جاري ضغط الملفات (بدون node_modules)..."
# ضغط مجلد backend في ملف واحد سريع (يتطلب وجود tar أو zip على جهازك)
tar -czf backend.tar.gz --exclude='node_modules' --exclude='.git' backend/

echo "📤 جاري رفع الملف المضغوط (سريع جداً)..."
scp backend.tar.gz $USER@$HOST:~

echo "� جاري فك الضغط على السيرفر..."
ssh $USER@$HOST "mkdir -p $REMOTE_DIR && tar -xzf ~/backend.tar.gz -C $REMOTE_DIR --strip-components=1 && rm ~/backend.tar.gz"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم الرفع بنجاح وبسرعة!"
    echo "⚙️ الخطوات التالية:"
    echo "  1. ادخل SSH وشغل npm install على السيرفر."
    echo "  2. تأكد من إعدادات المتغيرات البيئية في AlwaysData."
else
    echo ""
    echo "❌ فشل الرفع السريع!"
    exit 1
fi

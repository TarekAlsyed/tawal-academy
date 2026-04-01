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

echo "⚙️ جاري فك الضغط وإعداد البيئة على السيرفر..."
ssh $USER@$HOST "mkdir -p $REMOTE_DIR && tar -xzf ~/backend.tar.gz -C $REMOTE_DIR --strip-components=1 && \
                 cd $REMOTE_DIR && \
                 cp .env.alwaysdata .env && \
                 rm ~/backend.tar.gz"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم الرفع والإعداد المبدئي بنجاح!"
    echo "⚙️ الخطوات التالية المطلوبة منك:"
    echo "  1. ادخل SSH للمجلد: cd $REMOTE_DIR"
    echo "  2. شغل الأمر: npm install --production"
    echo "  3. تأكد من إعداد 'Site' في لوحة تحكم AlwaysData ليشير إلى: $REMOTE_DIR/src/server.js"
    echo "  4. تأكد من أن 'Command' هو: node src/server.js"
else
    echo ""
    echo "❌ فشل الرفع أو الإعداد!"
    exit 1
fi

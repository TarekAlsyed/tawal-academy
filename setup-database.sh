#!/bin/bash

echo "🗄️  إعداد قاعدة البيانات..."
echo ""

cd backend

echo "1️⃣  إنشاء الجداول..."
node src/config/createTables.js

if [ $? -ne 0 ]; then
    echo "❌ فشل إنشاء الجداول!"
    exit 1
fi

echo ""
echo "2️⃣  إصلاح مشكلة الإيميلات المكررة..."
node fix-duplicate-emails.js

echo ""
echo "3️⃣  إنشاء حساب Admin..."
node create-admin.js

echo ""
echo "✅ تم إعداد قاعدة البيانات بنجاح!"
echo ""

cd ..

#!/bin/bash

echo "🚀 رفع Frontend على GitHub Pages..."
echo ""

cd frontend

# التأكد من تثبيت gh-pages
if ! grep -q '"gh-pages"' package.json; then
    echo "📦 تثبيت gh-pages..."
    npm install --save-dev gh-pages
fi

# بناء المشروع
echo "🔨 جاري بناء المشروع..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ فشل بناء المشروع!"
    exit 1
fi

# رفع على GitHub Pages
echo "📤 جاري الرفع على GitHub Pages..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم رفع Frontend بنجاح!"
    echo "🌐 الرابط: https://tarekalsyed.github.io/tawal-academy"
    echo ""
    echo "⏰ انتظر 2-3 دقائق حتى يظهر الموقع"
    echo ""
else
    echo ""
    echo "❌ فشل رفع Frontend!"
    exit 1
fi

cd ..

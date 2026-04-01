#!/bin/bash

echo "🧪 اختبار شامل للمشروع..."
echo ""

echo "════════════════════════════════════════"
echo "🔍 اختبار Backend"
echo "════════════════════════════════════════"
echo ""

BACKEND_URL="https://tawal-academy-backend.fly.dev"

echo "📡 اختبار $BACKEND_URL..."
HEALTH=$(curl -s "$BACKEND_URL" | grep -o '"success":true' || echo "fail")

if [ "$HEALTH" = '"success":true' ]; then
    echo "✅ Backend يعمل بنجاح!"
else
    echo "❌ Backend لا يعمل!"
fi

echo ""
echo "════════════════════════════════════════"
echo "🔍 اختبار Frontend"
echo "════════════════════════════════════════"
echo ""

FRONTEND_URL="https://tarekalsyed.github.io/tawal-academy"

echo "📡 اختبار $FRONTEND_URL..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$STATUS" = "200" ]; then
    echo "✅ Frontend يعمل بنجاح!"
else
    echo "❌ Frontend لا يعمل! (Status: $STATUS)"
    echo "   انتظر بضع دقائق وحاول مرة أخرى"
fi

echo ""
echo "════════════════════════════════════════"
echo "📋 معلومات الوصول"
echo "════════════════════════════════════════"
echo ""
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "Admin:    admin@tawal.com / admin123"
echo "Student:  أي Gmail"
echo ""

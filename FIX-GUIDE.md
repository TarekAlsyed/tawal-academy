# 🔧 دليل إصلاح مشاكل Tawal Academy

## 🐛 المشاكل التي تم اكتشافها وإصلاحها:

### 1. ❌ مشكلة duplicate key في قاعدة البيانات

**الخطأ:**
```
duplicate key value violates unique constraint "users_email_key"
```

**السبب:**
- القيد الفريد كان على (email, device_id) مع
- عند تغيير الجهاز، كان يحاول إنشاء مستخدم جديد بنفس الإيميل

**الحل:**
1. تم تعديل User.js ليبحث بالإيميل فقط
2. تم إنشاء سكريبت fix-duplicate-emails.js لإصلاح القاعدة
3. تم تحديث createTables.js

**كيفية الإصلاح:**
```bash
cd backend
node fix-duplicate-emails.js
```

---

### 2. ❌ خطأ 500 عند تسجيل الدخول

**السبب:**
- النموذج القديم في User.js كان يحاول إضافة مستخدم بنفس الإيميل

**الحل:**
- تم تعديل User.js ليتحقق من الإيميل فقط
- إذا وُجد المستخدم، يُحدث device_id
- إذا لم يوجد، ينشئ مستخدم جديد

---

### 3. ❌ صفحة 404 على GitHub Pages

**الخطأ:**
```
404 - There isn't a GitHub Pages site here
```

**الأسباب المحتملة:**
1. لم يتم رفع Frontend بشكل صحيح
2. GitHub Pages غير مُفعّل
3. مشكلة في routing مع HashRouter

**الحل:**
1. تم إضافة 404.html لـ GitHub Pages
2. تم تحديث index.html بـ redirect script
3. تم التأكد من package.json يحتوي على homepage

**كيفية الإصلاح:**
```bash
./deploy-frontend.sh
```

ثم:
1. اذهب إلى GitHub → Settings → Pages
2. تأكد من اختيار: Source = **gh-pages branch**
3. انتظر 2-3 دقائق

---

## 🚀 خطوات الإصلاح الكاملة:

### الخطوة 1: إصلاح قاعدة البيانات
```bash
./setup-database.sh
```

### الخطوة 2: رفع Backend
```bash
./deploy-backend.sh
```

### الخطوة 3: رفع Frontend
```bash
./deploy-frontend.sh
```

### الخطوة 4: الاختبار
```bash
./test-all.sh
```

---

### 4. ❌ خطأ "تم تجاوز الحد المسموح لمحاولات الدخول"

**الخطأ:**
```
تم تجاوز الحد المسموح لمحاولات الدخول. يرجى المحاولة لاحقاً.
```

**السبب:**
- كان النظام يطبق حدًا صارمًا جدًا (10 محاولات في الساعة) لكل IP.
- كان يتم احتساب المحاولات الناجحة ضمن هذا الحد، مما قد يمنع المستخدمين الشرعيين من الدخول إذا قاموا بتسجيل الدخول عدة مرات.

**الحل:**
1. تم زيادة الحد إلى 50 محاولة كل 15 دقيقة.
2. تم تفعيل خيار `skipSuccessfulRequests: true` لعدم احتساب عمليات تسجيل الدخول الناجحة ضمن الحد.
3. تم تقليل نافذة الوقت من ساعة إلى 15 دقيقة لتسريع رفع الحظر التلقائي.

**الملف المعدل:**
- `backend/src/config/security.js`


### ✅ قاعدة البيانات:
```bash
cd backend
node fix-duplicate-emails.js
```
يجب أن ترى:
```
✅ تم إصلاح قاعدة البيانات بنجاح!
```

### ✅ تسجيل الدخول:
1. افتح: https://tarekalsyed.github.io/tawal-academy
2. أدخل اسم وإيميل Gmail
3. يجب أن يعمل بدون خطأ 500

### ✅ صفحة Admin:
1. افتح: https://tarekalsyed.github.io/tawal-academy/#/admin/login
2. يجب أن تظهر صفحة تسجيل دخول (وليس 404)

---

## 🔍 استكشاف الأخطاء:

### Backend لا يعمل:
```bash
cd backend
fly logs
```

### Frontend لا يظهر:
1. تحقق من GitHub Pages Settings
2. تأكد من branch = gh-pages
3. انتظر 5 دقائق
4. امسح الكاش (Ctrl+Shift+R)

### خطأ في تسجيل الدخول:
1. افتح Developer Tools (F12)
2. انظر Console للأخطاء
3. تحقق من Network tab

---

## 📞 الدعم:

إذا استمرت المشاكل:
1. شغّل `./test-all.sh`
2. التقط screenshot للـ Console (F12)
3. أرسل الأخطاء

---

💡 **نصيحة:** احتفظ بهذا الملف للرجوع إليه!

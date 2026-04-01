# نظام الحفظ التلقائي للصور (Image Auto-Save System)

تم تصميم هذا النظام لضمان عدم فقدان الصور المهمة في المنصة (مثل أغلفة المواد وصور المستخدمين) وحمايتها من عمليات المسح المؤقت أو الحذف غير المقصود.

## المكونات الرئيسية

1. **هيكل التخزين (Storage Structure)**:
   - المسار الرئيسي: `backend/uploads/permanent_storage/images` (على الخادم Fly.io يتم توجيهه إلى المجلد الدائم `/app/uploads/permanent_storage`)
   - هذا المجلد منفصل عن مجلدات الرفع التقليدية، مما يجعله آمناً من أي عمليات تنظيف للملفات المؤقتة.

2. **قاعدة البيانات (Database Table)**:
   - الجدول: `auto_saved_images`
   - يخزن مسارات الصور الأصلية والمحفوظة، نوع الصورة، المصدر، والأولوية.

3. **طبقة المنطق (Logic Layer)**:
   - `backend/src/services/imageAutoSaveService.js`: المسؤول عن تصنيف الصور وحفظها.
   - `backend/src/models/AutoSavedImage.js`: المسؤول عن التعامل مع بيانات الصور في قاعدة البيانات.

4. **الوسيط (Middleware)**:
   - `autoSaveUploadedImages`: يتم وضعه في المسارات التي تتطلب رفع صور، ويقوم تلقائياً باكتشاف الصور وحفظ نسخة دائمة منها.

## كيفية الاستخدام

يتم تفعيل الحفظ التلقائي ببساطة عن طريق إضافة الوسيط `autoSaveUploadedImages` إلى المسار المطلوب في `backend/src/routes/adminRoutes.js`:

```javascript
router.post('/subjects', 
  adminAuth, 
  upload.single('cover'), 
  verifyFileSignature, 
  autoSaveUploadedImages, // <--- هنا
  checkPermission('subjects', 'add'), 
  subjectValidation, 
  adminSubjectController.createSubject
);
```

## المراقبة والتتبع (Monitoring)

يمكن للمشرفين تتبع حالة الصور المحفوظة عبر المسارات التالية (تتطلب صلاحيات `stats`):

- **قائمة الصور المحفوظة**: `GET /api/admin/security/auto-saved-images`
- **إحصائيات الحفظ**: `GET /api/admin/security/auto-saved-images/stats`

## استرجاع الصور

في حال تم حذف صورة من مجلد `uploads` الأصلي، يمكن العثور على النسخة الدائمة في `permanent_storage/images` باستخدام المسار المخزن في جدول `auto_saved_images`.

## مستويات الأولوية

- **أولوية عالية (1)**: أغلفة المواد (Covers).
- **أولوية متوسطة (2)**: صور الملفات الشخصية (Profiles).
- **أولوية منخفضة (3)**: الصور العامة المرفوعة.

## الاختبار

يمكن تشغيل اختبار النظام عبر المسار: `node scripts/test-image-autosave.js`

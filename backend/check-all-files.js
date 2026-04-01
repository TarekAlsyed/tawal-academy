const fs = require('fs');
const path = require('path');

console.log('🔍 فحص شامل لملفات Backend...\n');

const requiredFiles = {
  'Controllers': [
    'src/controllers/adminAuthController.js',
    'src/controllers/adminExamController.js',
    'src/controllers/adminNotificationController.js',
    'src/controllers/adminQuestionReplyController.js',
    'src/controllers/adminStatsController.js',
    'src/controllers/adminStudentController.js',
    'src/controllers/adminSubjectController.js',
    'src/controllers/adminTermController.js',
    'src/controllers/authController.js',
    'src/controllers/examController.js',
    'src/controllers/notificationController.js',
    'src/controllers/profileController.js',
    'src/controllers/questionController.js',
    'src/controllers/subjectController.js'
  ],
  'Middlewares': [
    'src/middlewares/auth.js',
    'src/middlewares/adminAuth.js',
    'src/middlewares/deviceCheck.js',
    'src/middlewares/upload.js',
    'src/middlewares/errorHandler.js'
  ],
  'Models': [
    'src/models/Admin.js',
    'src/models/Exam.js',
    'src/models/Question.js',
    'src/models/StudentQuestion.js',
    'src/models/Subject.js',
    'src/models/Term.js',
    'src/models/User.js'
  ],
  'Routes': [
    'src/routes/authRoutes.js',
    'src/routes/examRoutes.js',
    'src/routes/subjectRoutes.js',
    'src/routes/profileRoutes.js',
    'src/routes/questionRoutes.js',
    'src/routes/notificationRoutes.js',
    'src/routes/adminRoutes.js',
    'src/routes/index.js'
  ],
  'Utils': [
    'src/utils/emailValidator.js',
    'src/utils/notificationSender.js',
    'src/utils/pointsCalculator.js',
    'src/utils/questionParser.js'
  ],
  'Config': [
    'src/config/database.js',
    'src/config/createTables.js'
  ]
};

let missingFiles = [];
let existingFiles = [];

Object.keys(requiredFiles).forEach(category => {
  console.log(`\n📁 ${category}:`);
  
  requiredFiles[category].forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      console.log(`  ✅ ${file}`);
      existingFiles.push(file);
    } else {
      console.log(`  ❌ ${file} - مفقود!`);
      missingFiles.push(file);
    }
  });
});

console.log('\n\n════════════════════════════════════════');
console.log('📊 ملخص الفحص:');
console.log('════════════════════════════════════════');
console.log(`✅ ملفات موجودة: ${existingFiles.length}`);
console.log(`❌ ملفات مفقودة: ${missingFiles.length}`);

if (missingFiles.length > 0) {
  console.log('\n🔴 الملفات المفقودة:');
  missingFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('\n⚠️  يجب إنشاء هذه الملفات قبل تشغيل السيرفر!');
  process.exit(1);
} else {
  console.log('\n✅ جميع الملفات المطلوبة موجودة!');
  console.log('🚀 Backend جاهز للتشغيل!');
  process.exit(0);
}

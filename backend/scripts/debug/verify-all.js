const fs = require('fs');
const path = require('path');

console.log('🔍 فحص شامل نهائي...\n');

const allFiles = {
  'Controllers': {
    'adminAuthController.js': 'src/controllers/adminAuthController.js',
    'adminExamController.js': 'src/controllers/adminExamController.js',
    'adminNotificationController.js': 'src/controllers/adminNotificationController.js',
    'adminQuestionReplyController.js': 'src/controllers/adminQuestionReplyController.js',
    'adminStatsController.js': 'src/controllers/adminStatsController.js',
    'adminStudentController.js': 'src/controllers/adminStudentController.js',
    'adminSubjectController.js': 'src/controllers/adminSubjectController.js',
    'adminTermController.js': 'src/controllers/adminTermController.js',
    'authController.js': 'src/controllers/authController.js',
    'examController.js': 'src/controllers/examController.js',
    'notificationController.js': 'src/controllers/notificationController.js',
    'profileController.js': 'src/controllers/profileController.js',
    'questionController.js': 'src/controllers/questionController.js',
    'subjectController.js': 'src/controllers/subjectController.js'
  },
  'Middlewares': {
    'auth.js': 'src/middlewares/auth.js',
    'adminAuth.js': 'src/middlewares/adminAuth.js',
    'deviceCheck.js': 'src/middlewares/deviceCheck.js',
    'upload.js': 'src/middlewares/upload.js',
    'errorHandler.js': 'src/middlewares/errorHandler.js'
  },
  'Models': {
    'Admin.js': 'src/models/Admin.js',
    'Exam.js': 'src/models/Exam.js',
    'Question.js': 'src/models/Question.js',
    'StudentQuestion.js': 'src/models/StudentQuestion.js',
    'Subject.js': 'src/models/Subject.js',
    'Term.js': 'src/models/Term.js',
    'User.js': 'src/models/User.js'
  },
  'Routes': {
    'authRoutes.js': 'src/routes/authRoutes.js',
    'examRoutes.js': 'src/routes/examRoutes.js',
    'subjectRoutes.js': 'src/routes/subjectRoutes.js',
    'profileRoutes.js': 'src/routes/profileRoutes.js',
    'questionRoutes.js': 'src/routes/questionRoutes.js',
    'notificationRoutes.js': 'src/routes/notificationRoutes.js',
    'adminRoutes.js': 'src/routes/adminRoutes.js',
    'index.js': 'src/routes/index.js'
  },
  'Utils': {
    'emailValidator.js': 'src/utils/emailValidator.js',
    'notificationSender.js': 'src/utils/notificationSender.js',
    'pointsCalculator.js': 'src/utils/pointsCalculator.js',
    'questionParser.js': 'src/utils/questionParser.js'
  }
};

let missing = [];
let total = 0;
let found = 0;

Object.keys(allFiles).forEach(category => {
  console.log(`\n📁 ${category}:`);
  
  Object.keys(allFiles[category]).forEach(fileName => {
    total++;
    const filePath = path.join(__dirname, allFiles[category][fileName]);
    
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${fileName}`);
      found++;
    } else {
      console.log(`  ❌ ${fileName} - مفقود!`);
      missing.push(allFiles[category][fileName]);
    }
  });
});

console.log('\n\n════════════════════════════════════════');
console.log('📊 النتيجة النهائية:');
console.log('════════════════════════════════════════');
console.log(`✅ موجود: ${found}/${total}`);
console.log(`❌ مفقود: ${missing.length}/${total}`);

if (missing.length > 0) {
  console.log('\n🔴 الملفات المفقودة:');
  missing.forEach(f => console.log(`   - ${f}`));
  console.log('\n⚠️  يجب إنشاء هذه الملفات!');
  process.exit(1);
} else {
  console.log('\n✅ جميع الملفات موجودة!');
  console.log('🚀 Backend جاهز 100%!');
  process.exit(0);
}


const pool = require('../src/config/database');
const { calculateExamPoints, POINTS, addPoints } = require('../src/utils/pointsCalculator');
const Exam = require('../src/models/Exam');
const Subject = require('../src/models/Subject');
const StudentQuestion = require('../src/models/StudentQuestion');

async function runTests() {
  console.log('🚀 بدء اختبارات النظام الشاملة...');
  let testsPassed = 0;
  let testsFailed = 0;

  const logResult = (name, passed, error = null) => {
    if (passed) {
      console.log(`✅ [PASS] ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ [FAIL] ${name}${error ? ': ' + error : ''}`);
      testsFailed++;
    }
  };

  try {
    // 1. اختبار منطق حساب النقاط
    console.log('\n--- اختبار منطق النقاط ---');
    logResult('نقطة كاملة (100%)', calculateExamPoints(100) === 100);
    logResult('نقطة امتياز (95%)', calculateExamPoints(95) === 80);
    logResult('نقطة جيد جداً (85%)', calculateExamPoints(85) === 60);
    logResult('نقطة جيد (75%)', calculateExamPoints(75) === 40);
    logResult('نقطة مقبول (65%)', calculateExamPoints(65) === 20);
    logResult('رسوب (50%)', calculateExamPoints(50) === 0);

    // 2. اختبار قيم النقاط الثابتة
    logResult('نقاط تحميل PDF', POINTS.DOWNLOAD_PDF === 5);
    logResult('نقاط مشاهدة صورة', POINTS.VIEW_IMAGE === 2);
    logResult('نقاط تقييم مادة', POINTS.RATE_SUBJECT === 3);

    // 3. اختبار قاعدة البيانات (المستخدم والأسئلة)
    console.log('\n--- اختبار قاعدة البيانات والنماذج ---');
    
    // البحث عن طالب تجريبي أو استخدام طالب موجود
    const studentRes = await pool.query('SELECT id, total_points FROM users LIMIT 1');
    if (studentRes.rows.length > 0) {
      const student = studentRes.rows[0];
      const initialPoints = student.total_points;
      
      // تجربة إضافة نقاط
      const added = await addPoints(student.id, 'test_action', 10, { test: true });
      if (added) {
        const updatedRes = await pool.query('SELECT total_points FROM users WHERE id = $1', [student.id]);
        logResult('إضافة نقاط وتحديث قاعدة البيانات', updatedRes.rows[0].total_points === initialPoints + 10);
        // إعادة النقاط كما كانت
        await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [initialPoints, student.id]);
      } else {
        logResult('إضافة نقاط وتحديث قاعدة البيانات', false, 'فشلت دالة addPoints');
      }
    } else {
      console.log('⚠️ لم يتم العثور على طلاب للاختبار، يتخطى اختبار النقاط الفعلي');
    }

    // 4. اختبار منطق فتح المستويات في الامتحانات
    console.log('\n--- اختبار منطق الامتحانات ---');
    const examRes = await pool.query('SELECT id, pass_percentage FROM exams LIMIT 1');
    if (examRes.rows.length > 0) {
      const exam = examRes.rows[0];
      logResult('استرجاع بيانات الامتحان', true);
      
      // فحص ترتيب الأسئلة
      const examWithQuestions = await Exam.findByIdWithQuestions(exam.id);
      if (examWithQuestions && examWithQuestions.questions) {
        const questions = examWithQuestions.questions;
        if (questions.length > 0) {
          let isOrdered = true;
          for (let i = 0; i < questions.length - 1; i++) {
            if (questions[i].question_order > questions[i+1].question_order) {
              isOrdered = false;
              break;
            }
          }
          logResult('ترتيب الأسئلة ثابت', isOrdered);
        } else {
          console.log('⚠️ الامتحان لا يحتوي على أسئلة');
        }
      }
    } else {
      console.log('⚠️ لم يتم العثور على امتحانات للاختبار');
    }

    // 5. اختبار حدود الأسئلة الشهرية
    console.log('\n--- اختبار حدود الأسئلة ---');
    if (studentRes.rows.length > 0) {
      const canAsk = await StudentQuestion.canAskQuestion(studentRes.rows[0].id);
      logResult('التحقق من صلاحية طرح سؤال', typeof canAsk === 'boolean');
    }

    // 6. اختبار معالج الأسئلة (Question Parser)
    console.log('\n--- اختبار معالج الأسئلة ---');
    const { parseTextQuestions } = require('../src/utils/questionParser');
    const sampleText = `1. ما هي عاصمة مصر؟
    أ) القاهرة
    ب) الإسكندرية
    ج) الجيزة
    د) المنصورة
    الإجابة: أ
    
    2. هل الأرض كروية؟
    الإجابة: صح`;
    
    const parsed = parseTextQuestions(sampleText);
    logResult('معالجة الأسئلة النصية (اختيار من متعدد)', parsed.success && parsed.questions[0].question_text === 'ما هي عاصمة مصر؟');
    logResult('معالجة الأسئلة النصية (صح/خطأ)', parsed.success && parsed.questions[1].type === 'true_false');

    console.log('\n--- ملخص الاختبار ---');
    console.log(`إجمالي الاختبارات الناجحة: ${testsPassed}`);
    console.log(`إجمالي الاختبارات الفاشلة: ${testsFailed}`);

    if (testsFailed === 0) {
      console.log('\n🌟 النظام يبدو مستقراً وجاهزاً للعمل!');
    } else {
      console.log('\n⚠️ توجد بعض المشاكل التي تتطلب مراجعة.');
    }

  } catch (error) {
    console.error('\n❌ حدث خطأ غير متوقع أثناء الاختبار:', error);
  } finally {
    await pool.end();
  }
}

runTests();

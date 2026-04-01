const pool = require('../src/config/database');
const Term = require('../src/models/Term');
const Subject = require('../src/models/Subject');
require('dotenv').config();

async function testAddSubject() {
  console.log('🧪 بدء اختبار إضافة مادة دراسية...');
  
  try {
    // 1. التأكد من وجود تيرم واحد على الأقل
    console.log('1. التحقق من التيرمات...');
    let terms = await Term.findAll();
    let termId;
    
    if (terms.length === 0) {
      console.log('⚠️ لا يوجد تيرمات، يتم إنشاء تيرم تجريبي...');
      const newTerm = await Term.create('الفصل الدراسي الأول', 'تيرم تجريبي لاختبار النظام');
      termId = newTerm.id;
      console.log(`✅ تم إنشاء التيرم بنجاح: ${newTerm.name} (ID: ${termId})`);
    } else {
      termId = terms[0].id;
      console.log(`✅ تم العثور على تيرم موجود: ${terms[0].name} (ID: ${termId})`);
    }

    // 2. إضافة مادة دراسية تجريبية
    console.log('2. إضافة مادة دراسية تجريبية...');
    const subjectName = `مادة تجريبية - ${new Date().toLocaleTimeString()}`;
    const subject = await Subject.create(
      termId,
      subjectName,
      'وصف المادة التجريبية التي تم إنشاؤها آلياً للتأكد من سلامة النظام.',
      'default-cover.jpg',
      'open',
      null, // scheduled_at
      null  // created_by (admin id)
    );
    
    console.log(`✅ تم إضافة المادة بنجاح: ${subject.name} (ID: ${subject.id})`);

    // 3. التحقق من إمكانية استرجاع المادة
    console.log('3. التحقق من استرجاع المادة...');
    const foundSubject = await Subject.findById(subject.id);
    if (foundSubject && foundSubject.name === subjectName) {
      console.log('✅ تم استرجاع المادة بنجاح وتطابق البيانات.');
    } else {
      throw new Error('❌ فشل استرجاع المادة أو البيانات غير متطابقة!');
    }

    // 4. التحقق من قائمة جميع المواد (getAllSubjects logic)
    console.log('4. التحقق من قائمة المواد...');
    const allSubjects = await Subject.findAll();
    const exists = allSubjects.some(s => s.id === subject.id);
    if (exists) {
      console.log('✅ المادة تظهر في قائمة المواد بنجاح.');
    } else {
      throw new Error('❌ المادة لا تظهر في قائمة المواد!');
    }

    console.log('\n🌟 تم اختبار دورة إضافة المادة بنجاح 100%!');
    
  } catch (error) {
    console.error('\n❌ حدث خطأ أثناء الاختبار:');
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testAddSubject();

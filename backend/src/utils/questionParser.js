const XLSX = require('xlsx');

// تحليل ملف Excel وتحويله إلى أسئلة
const parseExcelQuestions = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const questions = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // تحديد نوع السؤال
      const type = row['النوع'] || row['Type'] || row['type'];
      const isMultiple = type?.toLowerCase().includes('اختيار') || type?.toLowerCase().includes('multiple');
      const isTrueFalse = type?.toLowerCase().includes('صح') || type?.toLowerCase().includes('true');

      let questionData = {
        questionText: row['السؤال'] || row['Question'] || row['question'],
        type: isMultiple ? 'multiple' : 'true_false',
        correctAnswer: row['الإجابة الصحيحة'] || row['Correct Answer'] || row['correct_answer'],
        order: i + 1
      };

      if (isMultiple) {
        questionData.options = {
          a: row['الخيار أ'] || row['Option A'] || row['option_a'] || '',
          b: row['الخيار ب'] || row['Option B'] || row['option_b'] || '',
          c: row['الخيار ج'] || row['Option C'] || row['option_c'] || '',
          d: row['الخيار د'] || row['Option D'] || row['option_d'] || ''
        };
      } else {
        questionData.options = {
          a: 'صح',
          b: 'خطأ'
        };
      }

      // التحقق من صحة البيانات
      if (questionData.questionText && questionData.correctAnswer) {
        questions.push(questionData);
      }
    }

    return {
      success: true,
      questions: questions,
      count: questions.length
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطأ في قراءة ملف Excel: ' + error.message
    };
  }
};

// تحليل نص منظم وتحويله إلى أسئلة
const parseTextQuestions = (text) => {
  try {
    const questions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentQuestion = null;
    let questionNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // التعرف على بداية سؤال جديد
      if (line.match(/^س\d+[:：]/) || line.match(/^سؤال\s*\d+[:：]/)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        questionNumber++;
        currentQuestion = {
          questionText: line.replace(/^س\d+[:：]\s*/, '').replace(/^سؤال\s*\d+[:：]\s*/, ''),
          type: 'multiple',
          options: {},
          correctAnswer: '',
          order: questionNumber
        };
      }
      // التعرف على الخيارات
      else if (line.match(/^[أاabcdABCD][\)）\.]/) && currentQuestion) {
        const optionLetter = line.charAt(0).toLowerCase();
        const optionText = line.substring(2).trim();
        
        if (optionLetter === 'أ' || optionLetter === 'a') {
          currentQuestion.options.a = optionText;
        } else if (optionLetter === 'ب' || optionLetter === 'b') {
          currentQuestion.options.b = optionText;
        } else if (optionLetter === 'ج' || optionLetter === 'c') {
          currentQuestion.options.c = optionText;
        } else if (optionLetter === 'د' || optionLetter === 'd') {
          currentQuestion.options.d = optionText;
        }
      }
      // التعرف على الإجابة الصحيحة
      else if ((line.includes('الإجابة') || line.includes('الاجابة') || line.includes('Answer')) && currentQuestion) {
        const answer = line.split(':')[1]?.trim() || line.split('：')[1]?.trim();
        currentQuestion.correctAnswer = answer?.charAt(0).toLowerCase();
      }
    }

    // إضافة آخر سؤال
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // تحديد نوع الأسئلة (صح/خطأ أو اختيار من متعدد)
    questions.forEach(q => {
      const hasOnlyTwoOptions = Object.keys(q.options).length === 2;
      const isTrueFalse = (q.options.a === 'صح' || q.options.a?.toLowerCase() === 'true') &&
                          (q.options.b === 'خطأ' || q.options.b?.toLowerCase() === 'false');
      
      if (hasOnlyTwoOptions || isTrueFalse) {
        q.type = 'true_false';
      }
    });

    return {
      success: true,
      questions: questions,
      count: questions.length
    };
  } catch (error) {
    return {
      success: false,
      message: 'خطأ في تحليل النص: ' + error.message
    };
  }
};

module.exports = {
  parseExcelQuestions,
  parseTextQuestions
};

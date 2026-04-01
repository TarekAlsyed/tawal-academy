const XLSX = require("xlsx");
const mammoth = require("mammoth");

const answerMapper = {
  "أ": "a",
  "ب": "b",
  "ج": "c",
  "د": "d",
  "الخيار أ": "a",
  "الخيار ب": "b",
  "الخيار ج": "c",
  "الخيار د": "d",
  "خيار أ": "a",
  "خيار ب": "b",
  "خيار ج": "c",
  "خيار د": "d",
  "الاجابة أ": "a",
  "الاجابة ب": "b",
  "الاجابة ج": "c",
  "الاجابة د": "d",
  "صح": "a",
  "خطأ": "b",
  "A": "a",
  "B": "b",
  "C": "c",
  "D": "d",
  "1": "a",
  "2": "b",
  "3": "c",
  "4": "d",
  "true": "a",
  "false": "b",
  "yes": "a",
  "no": "b",
  "نعم": "a",
  "لا": "b"
};

const findColumnName = (row, possibleNames) => {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    // Exact match
    if (row[name] !== undefined) return row[name];
    
    // Case-insensitive and trimmed match
    const foundKey = keys.find(k => {
      const cleanK = k.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
      const cleanName = name.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
      return cleanK === cleanName;
    });
    if (foundKey) return row[foundKey];
  }
  return undefined;
};

const parseExcelQuestions = (filePath) => {
  try {
    console.log("Starting to parse Excel file:", filePath);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log("Sheet name:", sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log("Data length:", data ? data.length : 0);

    if (!data || data.length === 0) {
      console.log("Excel file is empty or headers missing");
      return { success: false, error: "ملف Excel فارغ أو لا يحتوي على بيانات. تأكد من أن الصف الأول يحتوي على أسماء الأعمدة." };
    }

    const questions = [];
    const errors = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Row number in Excel (1-indexed + header)
      
      const question_text = findColumnName(row, ["نص السؤال", "question_text", "السؤال"]);
      const questionTypeText = findColumnName(row, ["نوع السؤال", "question_type"]);
      const type = (questionTypeText === "صح/خطأ" || questionTypeText === "true_false" || questionTypeText === "صح أو خطأ") ? "true_false" : "multiple";

      let options = null;
      if (type === "multiple") {
        options = {
          a: findColumnName(row, ["الخيار أ", "option_a", "أ", "خيار 1", "الخيار 1", "option 1", "1"]) || "",
          b: findColumnName(row, ["الخيار ب", "option_b", "ب", "خيار 2", "الخيار 2", "option 2", "2"]) || "",
          c: findColumnName(row, ["الخيار ج", "option_c", "ج", "خيار 3", "الخيار 3", "option 3", "3"]) || "",
          d: findColumnName(row, ["الخيار د", "option_d", "د", "خيار 4", "الخيار 4", "option 4", "4"]) || "",
        };
        
        if (!options.a && !options.b) {
          errors.push(`الصف ${rowNum}: خيارات الإجابة مفقودة لأسئلة الاختيار من متعدد.`);
        }
      }

      let correctAnswer = findColumnName(row, ["الإجابة الصحيحة", "الإجابات الصحيحة", "correct_answer", "الإجابة", "إجابة"]) || "";
      
      if (!question_text) {
        errors.push(`الصف ${rowNum}: نص السؤال مفقود.`);
      }
      
      if (!correctAnswer) {
        errors.push(`الصف ${rowNum}: الإجابة الصحيحة مفقودة.`);
      }

      // Clean up answer and map it
      let cleanAnswer = String(correctAnswer).trim();
      let mappedAnswer = answerMapper[cleanAnswer];
      
      if (!mappedAnswer) {
        // Try to find if the answer contains any of the keys or starts with them
        if (cleanAnswer.includes("أ") || cleanAnswer.toLowerCase().startsWith("a")) mappedAnswer = "a";
        else if (cleanAnswer.includes("ب") || cleanAnswer.toLowerCase().startsWith("b")) mappedAnswer = "b";
        else if (cleanAnswer.includes("ج") || cleanAnswer.toLowerCase().startsWith("c")) mappedAnswer = "c";
        else if (cleanAnswer.includes("د") || cleanAnswer.toLowerCase().startsWith("d")) mappedAnswer = "d";
        else {
          // New logic: Check if the correct answer text matches any of the options text
          if (options) {
            const foundKey = Object.keys(options).find(key => 
              options[key] && String(options[key]).trim().toLowerCase() === cleanAnswer.toLowerCase()
            );
            if (foundKey) {
              mappedAnswer = foundKey;
            } else {
              mappedAnswer = cleanAnswer.toLowerCase();
            }
          } else {
            mappedAnswer = cleanAnswer.toLowerCase();
          }
        }
      }

      questions.push({
        question_text: question_text,
        type: type,
        options: options,
        correct_answer: mappedAnswer,
        question_order: index + 1,
      });
    });

    if (errors.length > 0) {
      return { 
        success: false, 
        error: "يوجد أخطاء في تنسيق الملف:\n" + errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n...و${errors.length - 5} أخطاء أخرى` : "")
      };
    }

    return { success: true, questions };
  } catch (error) {
    console.error("Excel Parsing Error:", error);
    return { success: false, error: `فشل في تحليل ملف Excel: ${error.message}` };
  }
};

const parseTextQuestions = (text) => {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "النص فارغ" };
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const questions = [];
    let currentQuestion = null;

    // Enhanced pattern matching for questions and options
    const questionPatterns = [
      /^\d+[\.\-\)]/,           // 1. or 1- or 1)
      /^[السؤال]+\s*\d+[:\.]/   // السؤال 1: or السؤال 1.
    ];

    const optionPatterns = [
      /^[أبجد][\.\-\)]/,        // أ. or ب) or ج-
      /^[a-d][\.\-\)]/i,        // a. or B)
      /^\([أبجدa-d]\)/i,         // (أ) or (a)
      /^(الخيار|خيار)\s*[أبجدa-d]/i // الخيار أ or خيار a
    ];

    const answerPatterns = [
      /^(الإجابة|الاجابة|الصحيحة|الحل|answer|ans)\s*[:\-]\s*/i,
      /^[أبجدa-d]$/i // Just the letter
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line is a question
      let isQuestion = questionPatterns.some(p => line.match(p));
      
      // If no pattern matches but we don't have a question yet, treat the first line as a question
      if (!currentQuestion && !isQuestion) isQuestion = true;

      if (isQuestion) {
        if (currentQuestion) {
          // Validate before pushing
          if (currentQuestion.question_text && currentQuestion.correct_answer) {
            questions.push(currentQuestion);
          }
        }
        
        currentQuestion = {
          question_text: line.replace(/^\d+[\.\-\)]|^[السؤال]+\s*\d+[:\.]/, '').trim(),
          type: 'multiple',
          options: {},
          correct_answer: null,
          question_order: questions.length + 1
        };
      } 
      // Check if line is an option
      else if (currentQuestion && optionPatterns.some(p => line.match(p))) {
        let optionKey = "";
        let optionText = "";

        if (line.match(/^[أبجدa-d][\.\-\)]/i)) {
          optionKey = line[0];
          optionText = line.substring(2).trim();
        } else if (line.match(/^\([أبجدa-d]\)/i)) {
          optionKey = line[1];
          optionText = line.substring(3).trim();
        } else {
          // Fallback for more complex matches
          const match = line.match(/[أبجدa-d]/i);
          if (match) {
            optionKey = match[0];
            optionText = line.replace(/^(الخيار|خيار)\s*[أبجدa-d]/i, '').trim();
          }
        }

        if (optionKey) {
          const mappedKey = answerMapper[optionKey] || optionKey.toLowerCase();
          currentQuestion.options[mappedKey] = optionText;
        }
      } 
      // Check if line is an answer
      else if (currentQuestion && (answerPatterns.some(p => line.match(p)) || line.length <= 2)) {
        let ans = line.replace(/^(الإجابة|الاجابة|الصحيحة|الحل|answer|ans)\s*[:\-]\s*/i, '').trim();
        if (ans) {
          const mappedAns = answerMapper[ans] || (ans.length === 1 ? answerMapper[ans.toUpperCase()] : null);
          if (mappedAns) {
            currentQuestion.correct_answer = mappedAns;
            
            // Check if true/false
            if (['صح', 'خطأ', 'true', 'false'].includes(ans.toLowerCase())) {
              currentQuestion.type = 'true_false';
            }
          }
        }
      }
      // If it's just text and we have a question, it might be a continuation of question text or an option
      else if (currentQuestion && !currentQuestion.correct_answer) {
        if (Object.keys(currentQuestion.options).length === 0) {
          currentQuestion.question_text += " " + line;
        }
      }
    }

    if (currentQuestion && currentQuestion.question_text && currentQuestion.correct_answer) {
      questions.push(currentQuestion);
    }

    if (questions.length === 0) {
      return { success: false, error: "لم يتم العثور على أسئلة صالحة. تأكد من كتابة السؤال ثم الخيارات ثم الإجابة." };
    }

    return { success: true, questions };
  } catch (error) {
    console.error("Text Parsing Error:", error);
    return { success: false, error: "حدث خطأ أثناء تحليل النص: " + error.message };
  }
};

const parseWordQuestions = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    return parseTextQuestions(text);
  } catch (error) {
    console.error("Word Parsing Error:", error);
    return { success: false, error: `فشل في تحليل ملف Word: ${error.message}` };
  }
};

module.exports = {
  parseExcelQuestions,
  parseTextQuestions,
  parseWordQuestions
};

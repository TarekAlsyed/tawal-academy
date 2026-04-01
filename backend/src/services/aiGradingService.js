const pool = require('../config/database');

/**
 * خدمة التصحيح الذكي باستخدام الذكاء الاصطناعي (AI Grading Service)
 * تدعم التكامل مع Gemini أو OpenAI لتصحيح الأسئلة المقالية
 */
class AIGradingService {
  /**
   * تصحيح محاولة امتحان بالكامل
   * @param {number} attemptId - معرف المحاولة
   */
  static async gradeAttempt(attemptId) {
    const client = await pool.connect();
    try {
      // 1. الحصول على المحاولة والأسئلة
      const attemptRes = await client.query(`
        SELECT ea.*, e.id as exam_id 
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        WHERE ea.id = $1
      `, [attemptId]);

      if (attemptRes.rows.length === 0) return;
      const attempt = attemptRes.rows[0];
      const answers = attempt.answers;

      // 2. الحصول على الأسئلة المقالية فقط للتصحيح
      const questionsRes = await client.query(`
        SELECT id, question_text, correct_answer, points, explanation
        FROM questions
        WHERE exam_id = $1 AND type = 'essay'
      `, [attempt.exam_id]);

      const essayQuestions = questionsRes.rows;
      if (essayQuestions.length === 0) {
        await client.query('UPDATE exam_attempts SET ai_status = $1 WHERE id = $2', ['none', attemptId]);
        return;
      }

      // 3. تحديث الحالة لـ "جاري المعالجة"
      await client.query('UPDATE exam_attempts SET ai_status = $1 WHERE id = $2', ['processing', attemptId]);

      const gradingResults = {};
      let totalAISuggestedPoints = 0;

      // 4. حلقة لتصحيح كل سؤال مقالي
      for (const question of essayQuestions) {
        const studentAnswer = answers[question.id];
        if (!studentAnswer) continue;

        // هنا يتم استدعاء API الذكاء الاصطناعي فعلياً
        // سنقوم بمحاكاة الاستجابة حالياً مع هيكل جاهز للتكامل
        const aiEvaluation = await this.mockAICall(question, studentAnswer);
        
        gradingResults[question.id] = {
          score: aiEvaluation.score,
          feedback: aiEvaluation.feedback,
          strengths: aiEvaluation.strengths,
          weaknesses: aiEvaluation.weaknesses
        };
        
        totalAISuggestedPoints += (aiEvaluation.score / 100) * question.points;
      }

      // 5. حفظ النتائج في قاعدة البيانات
      await client.query(`
        UPDATE exam_attempts 
        SET ai_grading_data = $1, 
            ai_status = 'completed', 
            ai_suggested_score = $2
        WHERE id = $3
      `, [JSON.stringify(gradingResults), totalAISuggestedPoints, attemptId]);

      console.log(`✅ تم الانتهاء من التصحيح الذكي للمحاولة رقم ${attemptId}`);

    } catch (error) {
      console.error('❌ خطأ في خدمة التصحيh الذكي:', error);
      await client.query('UPDATE exam_attempts SET ai_status = $1 WHERE id = $2', ['failed', attemptId]);
    } finally {
      client.release();
    }
  }

  /**
   * محاكاة استدعاء الذكاء الاصطناعي (Gemini/OpenAI)
   * في الإنتاج، يتم استبدال هذا بـ axios.post لمزود الخدمة
   */
  static async mockAICall(question, studentAnswer) {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 1500));

    // منطق بسيط للمحاكاة: إذا كانت الإجابة طويلة، درجة أعلى
    const lengthFactor = Math.min(studentAnswer.length / 100, 1);
    const score = Math.floor(60 + (40 * lengthFactor));

    return {
      score: score,
      feedback: "إجابة جيدة تغطي النقاط الأساسية، ولكن تحتاج لمزيد من التفصيل في الجزء التقني.",
      strengths: ["وضوح الأسلوب", "فهم السياق"],
      weaknesses: ["نقص في الأمثلة التطبيقية"]
    };
  }
}

module.exports = AIGradingService;

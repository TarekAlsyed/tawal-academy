const Subject = require('../models/Subject');
const { addPoints, POINTS } = require('../utils/pointsCalculator');

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll();

    res.json({
      success: true,
      data: {
        subjects,
        count: subjects.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const subject = await Subject.findByIdWithContent(id, userId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'المادة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: { subject }
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const userId = req.user.id;

    await Subject.recordPDFDownload(pdfId);
    
    await addPoints(userId, 'download_pdf', POINTS.DOWNLOAD_PDF, { pdfId });

    res.json({
      success: true,
      message: 'تم تسجيل التحميل وإضافة النقاط'
    });
  } catch (error) {
    next(error);
  }
};

exports.viewImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    await Subject.recordImageView(imageId);
    
    await addPoints(userId, 'view_image', POINTS.VIEW_IMAGE, { imageId });

    res.json({
      success: true,
      message: 'تم تسجيل المشاهدة وإضافة النقاط'
    });
  } catch (error) {
    next(error);
  }
};

exports.rateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    await Subject.rateSubject(userId, id, rating);
    
    await addPoints(userId, 'rate_subject', POINTS.RATE_SUBJECT, { subjectId: id, rating });

    res.json({
      success: true,
      message: 'تم تسجيل التقييم وإضافة النقاط'
    });
  } catch (error) {
    next(error);
  }
};

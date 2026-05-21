/**
 * ✅ M-11 FIX: Middleware to validate route parameter IDs as positive integers.
 * Prevents invalid IDs from reaching the database and causing unnecessary PostgreSQL errors.
 * 
 * Usage in routes:
 *   const validateId = require('../middlewares/validateId');
 *   router.get('/subjects/:id', adminAuth, validateId(), controller.getById);
 *   router.delete('/subjects/:subjectId/pdfs/:pdfId', adminAuth, validateId('subjectId'), validateId('pdfId'), controller.delete);
 */

const validateId = (paramName = 'id') => (req, res, next) => {
  const raw = req.params[paramName];

  if (raw === undefined || raw === null) {
    return next(); // Param not present — let Express handle it
  }

  const parsed = parseInt(raw, 10);

  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== String(raw)) {
    return res.status(400).json({
      success: false,
      message: `المعرّف '${paramName}' غير صالح. يجب أن يكون رقماً صحيحاً موجباً.`
    });
  }

  // Replace with parsed integer for downstream use
  req.params[paramName] = parsed;
  next();
};

module.exports = validateId;

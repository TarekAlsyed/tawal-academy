const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

router.post('/upload', upload.single('file'), uploadToCloudinary, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    url: req.file.path,
  });
});

module.exports = router;

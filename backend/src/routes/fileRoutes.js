const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { adminAuth } = require('../middlewares/adminAuth');
const auth = require('../middlewares/auth');

// Helper to determine base uploads path
const getUploadsPath = () => {
    return (process.env.NODE_ENV === 'production' && fs.existsSync('/app/uploads'))
        ? '/app/uploads'
        : path.join(__dirname, '../../uploads');
};

// 1. Route to serve PDFs (Protected)
router.get('/pdfs/:filename', auth, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(getUploadsPath(), 'pdfs', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'File not found' });
    }
});

// 2. Route to serve Images (Protected for students)
router.get('/images/:filename', auth, (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(getUploadsPath(), 'images', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'Image not found' });
    }
});

// 3. Admin access to all files
router.get('/admin/:type/:filename', adminAuth, (req, res) => {
    const { type, filename } = req.params;
    const allowedTypes = ['pdfs', 'images', 'covers', 'excel'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid file type' });
    }

    const filePath = path.join(getUploadsPath(), type, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'File not found' });
    }
});

module.exports = router;
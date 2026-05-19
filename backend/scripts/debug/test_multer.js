const multer = require('multer');
const path = require('path');
const express = require('express');
const request = require('supertest');

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = '123';
        const ext = path.extname(file.originalname);
        console.log("Fieldname:", file.fieldname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.any(), (req, res) => {
    res.json({ files: req.files });
});

request(app)
    .post('/upload')
    .attach('../../../evil', Buffer.from('test'), 'test.jpg')
    .end((err, res) => {
        if (err) throw err;
        console.log(res.body);
    });

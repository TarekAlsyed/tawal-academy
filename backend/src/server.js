const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: ['https://tarekalsyed.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static('uploads'));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'مرحباً بك في Tawal Academy API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      student: {
        auth: '/api/auth',
        subjects: '/api/subjects',
        exams: '/api/exams',
        profile: '/api/profile',
        questions: '/api/questions',
        notifications: '/api/notifications'
      },
      admin: {
        auth: '/api/admin/login',
        subjects: '/api/admin/subjects',
        exams: '/api/admin/exams',
        students: '/api/admin/students',
        stats: '/api/admin/stats/dashboard'
      }
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ════════════════════════════════════════════════════════');
  console.log(`   Tawal Academy Backend Server`);
  console.log('🚀 ════════════════════════════════════════════════════════');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log('🚀 ════════════════════════════════════════════════════════');
  console.log('');
});

module.exports = app;

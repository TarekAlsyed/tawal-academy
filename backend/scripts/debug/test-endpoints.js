const axios = require('axios');

const API_URL = 'https://tawal-academy-backend.fly.dev/api';

const testEndpoints = async () => {
  console.log('🧪 اختبار جميع الـ Endpoints...\n');

  const endpoints = [
    { method: 'GET', path: '/admin/subjects', name: 'Admin - Get Subjects' },
    { method: 'GET', path: '/admin/students', name: 'Admin - Get Students' },
    { method: 'GET', path: '/admin/questions', name: 'Admin - Get Questions' },
    { method: 'GET', path: '/admin/stats/dashboard', name: 'Admin - Dashboard Stats' },
    { method: 'GET', path: '/subjects', name: 'Student - Get Subjects' },
    { method: 'GET', path: '/profile', name: 'Student - Profile' },
    { method: 'GET', path: '/notifications', name: 'Student - Notifications' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_URL}${endpoint.path}`,
        timeout: 5000
      });
      
      console.log(`✅ ${endpoint.name}: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  ${endpoint.name}: ${error.response.status} - ${error.response.data.message || 'Unauthorized'}`);
      } else {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }
};

testEndpoints();

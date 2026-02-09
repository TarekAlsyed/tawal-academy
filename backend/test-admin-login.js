const axios = require('axios');

const testAdminLogin = async () => {
  try {
    console.log('🔄 جاري اختبار تسجيل دخول الأدمن...');
    console.log('');

    const response = await axios.post('http://localhost:5000/api/admin/login', {
      email: 'admin@tawal.com',
      password: 'admin123'
    });

    console.log('✅ نجح تسجيل الدخول!');
    console.log('════════════════════════════════════════');
    console.log('الاستجابة من السيرفر:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('🔑 Token للاستخدام في الطلبات القادمة:');
    console.log(response.data.data.token);
    console.log('');

  } catch (error) {
    console.error('❌ فشل تسجيل الدخول!');
    if (error.response) {
      console.error('الخطأ:', error.response.data);
    } else {
      console.error('الخطأ:', error.message);
    }
  }
};

testAdminLogin();

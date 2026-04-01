const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('Testing admin login with invalid credentials...');
    const response = await axios.post('https://tawal-academy-backend.fly.dev/api/admin/login', {
      email: 'wrong@admin.com',
      password: 'wrongpassword'
    });
    console.log('Login successful (Wait, this is bad!):', response.data);
  } catch (error) {
    console.log('Login failed as expected:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAdminLogin();

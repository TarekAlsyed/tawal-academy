const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing student login...');
    const response = await axios.post('https://tawal-academy-backend.fly.dev/api/auth/login', {
      name: 'Test User',
      email: 'test@gmail.com'
    }, {
      headers: {
        'x-device-id': 'test-device-id'
      }
    });
    console.log('Login successful:', response.data);
  } catch (error) {
    console.error('Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();

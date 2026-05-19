const axios = require('axios');

async function testDeviceLock() {
  const email = 'device-test@gmail.com';
  const name = 'Device Test User';
  
  try {
    console.log('1. Logging in with first device...');
    const res1 = await axios.post('https://tawal-academy-backend.fly.dev/api/auth/login', {
      name, email
    }, {
      headers: { 'x-device-id': 'device-1' }
    });
    console.log('First login successful');

    console.log('\n2. Logging in with second device (should fail)...');
    const res2 = await axios.post('https://tawal-academy-backend.fly.dev/api/auth/login', {
      name, email
    }, {
      headers: { 'x-device-id': 'device-2' }
    });
    console.log('Second login successful (WAIT, this should have failed!)');
  } catch (error) {
    console.log('Second login failed as expected:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testDeviceLock();

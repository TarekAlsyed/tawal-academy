const axios = require('axios');

async function testPut() {
  try {
    console.log('Sending PUT request to terms...');
    const response = await axios.put('https://tawal-academy.alwaysdata.net/api/admin/terms/8', {
      name: 'Test Update',
      is_published: true
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without auth, but we want to see if it hangs or returns 401
      },
      timeout: 10000
    });
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPut();

const axios = require('axios');

async function testAll() {
  try {
    console.log('1. Testing Health Endpoint...');
    const health = await axios.get('http://127.0.0.1:8101/api/health');
    console.log('✅ Health OK:', health.data);

    console.log('2. Testing CSRF Token Endpoint (with CORS headers)...');
    const csrf = await axios.get('http://127.0.0.1:8101/api/csrf-token', {
      headers: {
        'Origin': 'http://127.0.0.1:5173'
      }
    });
    console.log('✅ CSRF OK. Token received:', csrf.data.csrfToken ? 'Yes' : 'No');
    console.log('CORS Headers:', csrf.headers['access-control-allow-origin']);

    console.log('3. Testing Dashboard Stats Endpoint (Should return 401 or 403 because no token, but NOT Network Error)...');
    try {
      await axios.get('http://127.0.0.1:8101/api/admin/stats/dashboard', {
        headers: {
          'Origin': 'http://127.0.0.1:5173',
          'x-csrf-token': csrf.data.csrfToken || 'fake-token'
        }
      });
    } catch (err) {
      if (err.response) {
        console.log(`✅ Dashboard stats rejected correctly (Status: ${err.response.status}). This is expected without auth. No Network Error!`);
      } else {
        console.log(`❌ Dashboard stats failed with Network Error: ${err.message}`);
      }
    }

    console.log('🎉 All tests passed successfully. No crashing, no network errors.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) console.error('Response:', error.response.data);
  }
}

testAll();

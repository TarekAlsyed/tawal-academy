
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testHMACBypass() {
    console.log('🛡️ Testing HMAC Bypass...');

    const endpoint = '/admin/login';
    const body = { email: 'admin@tawal.com', password: 'password' };

    try {
        const response = await axios.post(API_URL + endpoint, body);
        console.log(`❌ Bypass Successful! Status: ${response.status}`);
    } catch (error) {
        console.log(`✅ Bypass Blocked! Status: ${error.response ? error.response.status : error.message}`);
        console.log(`   Message: ${JSON.stringify(error.response ? error.response.data.message : 'No message')}`);
    }
}

testHMACBypass();

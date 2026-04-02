const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function testSystem() {
    console.log('🚀 Starting System Verification V2...');
    console.log(`📡 Target URL: ${BASE_URL}`);

    try {
        // 1. Health Check
        console.log('\n🔍 Testing Health Check...');
        const health = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health Check Passed:', health.data.version);

        // 2. Security Headers Check
        console.log('\n🔍 Testing Security Headers...');
        const headers = health.headers;
        const expectedHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'strict-transport-security',
            'content-security-policy'
        ];
        
        expectedHeaders.forEach(header => {
            if (headers[header]) {
                console.log(`✅ Header ${header}: ${headers[header].substring(0, 30)}...`);
            } else {
                console.warn(`⚠️ Header ${header} is missing!`);
            }
        });

        // 3. WAF Test (Simulated Attack)
        console.log('\n🔍 Testing WAF (Simulated SQL Injection)...');
        try {
            await axios.get(`${BASE_URL}/api/subjects?id=' OR '1'='1`);
            console.warn('⚠️ WAF might be bypassed (Request not blocked)');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ WAF Blocked malicious request (403 Forbidden)');
            } else {
                console.log(`ℹ️ Request returned status ${err.response?.status || 'unknown'}`);
            }
        }

        // 4. Integrity Header Check
        console.log('\n🔍 Testing Request Integrity (Simulated Tampering)...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, { name: 'test', email: 'test@gmail.com' }, {
                headers: {
                    'X-Request-Integrity': 'invalid-hmac',
                    'X-Request-Timestamp': Date.now().toString()
                }
            });
            console.warn('⚠️ Integrity check might be bypassed (Request not blocked)');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ Integrity Check Blocked tampered request (403 Forbidden)');
            } else {
                console.log(`ℹ️ Request returned status ${err.response?.status || 'unknown'}`);
            }
        }

        console.log('\n✨ System Verification Complete!');
    } catch (err) {
        console.error('❌ System Verification Failed:', err.message);
        if (err.response) {
            console.error('Error Response:', err.response.data);
        }
    }
}

testSystem();

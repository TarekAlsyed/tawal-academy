
const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api';
const APP_SECRET = 'tawal-elite-secret-2026-key'; // Fallback to common secret

const generateHMAC = (body, timestamp, secret) => {
    try {
        const canonicalObject = {};
        Object.keys(body || {}).sort().forEach(key => {
            canonicalObject[key] = body[key];
        });

        const dataString = JSON.stringify(canonicalObject);
        const payload = `${timestamp}.${dataString}`;
        
        return crypto.createHmac('sha256', secret)
                     .update(payload)
                     .digest('hex');
    } catch (e) {
        console.error('HMAC Error:', e);
        return '';
    }
};

const getHeaders = (body = {}) => {
    const timestamp = Date.now();
    const hmac = generateHMAC(body, timestamp, APP_SECRET);
    return {
        'X-Request-Integrity': hmac,
        'X-Request-Timestamp': String(timestamp),
        'X-App-Signature': 'TawalEliteShield-v2-Secr3t-S!gn@tur3-@2026',
        'X-Device-Id': 'audit-test-device-id',
        'Content-Type': 'application/json'
    };
};

async function auditEndpoints() {
    console.log('🔍 بدء الفحص الشامل للمنصة...\n');

    const endpoints = [
        { name: 'Health Check', url: '/health', method: 'GET' },
        { name: 'API Health', url: '/api/health', method: 'GET' },
        { name: 'Admin Login (Invalid Credentials)', url: '/api/admin/login', method: 'POST', body: { email: 'wrong@tawal.com', password: 'wrong' } },
        { name: 'Student Login (Invalid Credentials)', url: '/api/auth/login', method: 'POST', body: { email: 'wrong@tawal.com', name: 'wrong' } },
        { name: 'Get Subjects (Public)', url: '/api/subjects', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
        try {
            const config = {
                method: endpoint.method,
                url: 'http://localhost:5000' + endpoint.url,
                headers: getHeaders(endpoint.body || {}),
                data: endpoint.body
            };

            const startTime = Date.now();
            const response = await axios(config);
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            console.log(`✅ [${endpoint.name}] (${endpoint.method} ${endpoint.url})`);
            console.log(`   الحالة: ${response.status}`);
            console.log(`   زمن الاستجابة: ${responseTime}ms`);
            console.log(`   الرسالة: ${JSON.stringify(response.data.message || 'No message')}\n`);
        } catch (error) {
            console.log(`❌ [${endpoint.name}] (${endpoint.method} ${endpoint.url})`);
            console.log(`   الحالة: ${error.response ? error.response.status : 'No response'}`);
            console.log(`   الرسالة: ${JSON.stringify(error.response ? error.response.data.message : error.message)}\n`);
        }
    }
}

auditEndpoints();

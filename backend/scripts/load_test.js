
const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api';
const APP_SECRET = 'tawal-elite-secret-2026-key';

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
        'X-Device-Id': 'load-test-device-id',
        'Content-Type': 'application/json'
    };
};

async function runLoadTest(endpoint, method, count = 100) {
    console.log(`🚀 Starting load test for ${method} ${endpoint} with ${count} requests...`);
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
        const reqStartTime = Date.now();
        try {
            await axios({
                method,
                url: API_URL + endpoint,
                headers: getHeaders({})
            });
            results.push({ success: true, time: Date.now() - reqStartTime });
        } catch (error) {
            results.push({ success: false, time: Date.now() - reqStartTime });
        }
    }

    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.filter(r => !r.success).length;
    const totalResponseTime = results.reduce((acc, curr) => acc + curr.time, 0);
    const avgResponseTime = totalResponseTime / count;

    console.log(`\n📊 Results for ${endpoint}:`);
    console.log(`   Total Requests: ${count}`);
    console.log(`   Successful: ${successfulRequests}`);
    console.log(`   Failed: ${failedRequests}`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${(count / (totalTime / 1000)).toFixed(2)} req/sec`);
    console.log(`   Total Duration: ${totalTime}ms\n`);
}

async function start() {
    await runLoadTest('/health', 'GET', 50);
    await runLoadTest('/api/health', 'GET', 50);
}

start();

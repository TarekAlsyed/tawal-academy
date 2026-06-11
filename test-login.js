const https = require('https');

const timestamp = Date.now().toString();
const body = JSON.stringify({ email: "test@test.com", password: "test123" });

const options = {
  hostname: 'tawal-academy.alwaysdata.net',
  path: '/api/admin/login',
  method: 'POST',
  rejectUnauthorized: false,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-App-Signature': 'tawal_academy_sig_v2_2026_secure',
    'X-Request-Timestamp': timestamp,
    'X-Device-Id': 'test-device-123'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();

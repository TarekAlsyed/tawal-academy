const https = require('https');

const data = JSON.stringify({
  name: 'Test Update',
  is_published: true
});

const options = {
  hostname: 'tawal-academy.alwaysdata.net',
  port: 443,
  path: '/api/admin/terms/8',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 10000
};

console.log('Sending PUT request to https://tawal-academy.alwaysdata.net/api/admin/terms/8...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.on('timeout', () => {
  console.error('Request timed out!');
  req.destroy();
});

req.write(data);
req.end();

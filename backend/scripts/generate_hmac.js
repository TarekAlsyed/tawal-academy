
const crypto = require('crypto');

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

const APP_SECRET = process.env.APP_SECRET || 'tawal-elite-secret-2026-key';
const timestamp = Date.now();
const body = { email: 'admin@tawal.com', password: 'password' }; // Example
const hmac = generateHMAC(body, timestamp, APP_SECRET);

console.log('Timestamp:', timestamp);
console.log('HMAC:', hmac);
console.log('App Signature: TawalEliteShield-v2-Secr3t-S!gn@tur3-@2026');

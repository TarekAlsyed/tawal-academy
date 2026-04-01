const crypto = require('crypto');

// Get key from environment variable or use a fixed 32-byte fallback
const getEncryptionKey = () => {
    const rawKey = process.env.ENCRYPTION_KEY;
    if (!rawKey) {
        throw new Error('Critical Security Error: ENCRYPTION_KEY must be set in the environment variables.');
    }
    // Ensure the key is exactly 32 bytes for AES-256-CBC
    return crypto.createHash('sha256').update(rawKey).digest();
};

const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16; 

const encrypt = (text) => {
    try {
        if (!text) return null;
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(String(text));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error('Encryption Error:', e.message);
        // Secure error handling: don't return plain text in case of error
        throw new Error('فشل تشفير البيانات الحساسة');
    }
};

const decrypt = (text) => {
    try {
        if (!text || typeof text !== 'string' || !text.includes(':')) return text;
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error('Decryption Error:', e.message);
        // Secure error handling: return null instead of plain text if decryption fails
        return null;
    }
};

module.exports = { encrypt, decrypt };

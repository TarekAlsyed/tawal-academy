const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Hardcoded config
const BASE_URL = 'http://localhost:5000/api/admin';
const JWT_SECRET = 'tawal_academy_super_secret_key_production_2024';

// Generate Token for Restricted Admin (ID 8)
const token = jwt.sign(
    { adminId: 8, email: 'admin@example.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function testCreateSubject() {
    console.log('Testing Create Subject with Token for Admin 8 (Restricted)...');
    
    // Create a dummy image file
    const imagePath = path.join(__dirname, 'test-cover.jpg');
    fs.writeFileSync(imagePath, 'dummy image content');

    const form = new FormData();
    form.append('name', 'Test Subject Approval');
    form.append('termId', '1'); // Assuming Term ID 1 exists
    form.append('level', '1');
    form.append('division', 'general');
    form.append('cover', fs.createReadStream(imagePath));

    try {
        const response = await axios.post(`${BASE_URL}/subjects`, form, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            validateStatus: () => true
        });

        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(response.data, null, 2));

        // Cleanup
        fs.unlinkSync(imagePath);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
        }
        // Cleanup
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
}

testCreateSubject();

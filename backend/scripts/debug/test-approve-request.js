const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/database');

// Hardcoded config
const BASE_URL = 'http://localhost:5000/api/admin';
const JWT_SECRET = 'tawal_academy_super_secret_key_production_2024';

// Generate Token for Super Admin (Who can approve requests)
// Assuming ID 1 is super admin
const token = jwt.sign(
    { adminId: 1, email: 'superadmin@example.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function testApprove() {
    console.log('Testing Approval with Super Admin Token...');
    
    // 1. Get the latest pending approval
    try {
        const result = await pool.query('SELECT id FROM pending_approvals WHERE status = \'pending\' ORDER BY created_at DESC LIMIT 1');
        if (result.rows.length === 0) {
            console.log('No pending approvals found to approve.');
            return;
        }
        
        const approvalId = result.rows[0].id;
        console.log(`Found pending approval ID: ${approvalId}`);

        // 2. Approve it
        const response = await axios.post(`${BASE_URL}/approvals/${approvalId}/approve`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            validateStatus: () => true
        });

        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response Status:', error.response.status);
            console.log('Response Data:', error.response.data);
        }
    } finally {
        pool.end();
    }
}

testApprove();

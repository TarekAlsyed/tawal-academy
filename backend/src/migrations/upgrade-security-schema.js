require('dotenv').config({ path: '../../.env' });
const pool = require('../config/database');

const upgradeSecuritySchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting Security Schema Upgrade...');

    // 1. Add fingerprint to users (Students)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS fingerprint TEXT,
      ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_ip VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_user_agent TEXT
    `);
    console.log('✅ Added advanced tracking columns to users table');

    // 2. Add fingerprint to sessions (Admins)
    await client.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS fingerprint TEXT,
      ADD COLUMN IF NOT EXISTS device_id VARCHAR(500)
    `);
    console.log('✅ Added fingerprint column to sessions table');

    // 3. Add security tracking to admins
    await client.query(`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP
    `);
    console.log('✅ Added security tracking to admins table');

    // 4. Create blocked_list if it doesn't exist or add missing columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_list (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        ip_address VARCHAR(100),
        device_id VARCHAR(500),
        reason TEXT,
        blocked_by INTEGER REFERENCES admins(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      ALTER TABLE blocked_list 
      ADD COLUMN IF NOT EXISTS fingerprint TEXT
    `);
    console.log('✅ Ensured blocked_list table and fingerprint column exist');

    // 5. Create student_violations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_violations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        violation_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) DEFAULT 'low',
        details JSONB,
        ip_address VARCHAR(100),
        device_id VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Ensured student_violations table exists');

    await client.query('COMMIT');
    console.log('✨ Security Schema Upgrade Completed Successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('❌ Security Schema Upgrade Failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  upgradeSecuritySchema().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = upgradeSecuritySchema;

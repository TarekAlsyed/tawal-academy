require('dotenv').config({ path: '../../.env' });
const pool = require('../config/database');

const upgradeSecuritySchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting Security Schema Upgrade...');

    // 1. Add advanced tracking columns to users table
    const userCols = [
      ['fingerprint', 'TEXT'],
      ['failed_attempts', 'INTEGER DEFAULT 0'],
      ['last_failed_attempt', 'TIMESTAMP'],
      ['last_ip', 'VARCHAR(100)'],
      ['last_user_agent', 'TEXT']
    ];
    for (const [col, type] of userCols) {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ Repaired users table');

    // 2. Add fingerprint to sessions (Admins)
    const sessionCols = [['fingerprint', 'TEXT'], ['device_id', 'VARCHAR(500)']];
    for (const [col, type] of sessionCols) {
      await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ Repaired sessions table');

    // 3. Add security tracking to admins
    const adminCols = [
      ['failed_attempts', 'INTEGER DEFAULT 0'],
      ['last_failed_attempt', 'TIMESTAMP'],
      ['is_blocked', 'BOOLEAN DEFAULT FALSE'],
      ['blocked_until', 'TIMESTAMP']
    ];
    for (const [col, type] of adminCols) {
      await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ Repaired admins table');

    // 4. Robust blocked_list table check and repair
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
    
    // Add all potential missing columns to blocked_list
    const blockedListCols = [
      ['fingerprint', 'TEXT'],
      ['ip_address', 'VARCHAR(100)'],
      ['expires_at', 'TIMESTAMP'],
      ['email', 'VARCHAR(255)'],
      ['device_id', 'VARCHAR(500)']
    ];

    for (const [col, type] of blockedListCols) {
      await client.query(`ALTER TABLE blocked_list ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ Fully repaired blocked_list table');

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
        fingerprint TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure all columns exist in student_violations (in case it was partially created)
    const violationCols = [['ip_address', 'VARCHAR(100)'], ['device_id', 'VARCHAR(500)'], ['fingerprint', 'TEXT']];
    for (const [col, type] of violationCols) {
      await client.query(`ALTER TABLE student_violations ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    console.log('✅ Ensured student_violations table is complete');
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

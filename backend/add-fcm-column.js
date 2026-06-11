const pool = require('./src/config/database');

async function addFcmTokenColumn() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);
    `);
    console.log('Successfully added fcm_token column to users table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding fcm_token column:', error);
    process.exit(1);
  }
}

addFcmTokenColumn();

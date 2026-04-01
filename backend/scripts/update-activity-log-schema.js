const pool = require('../src/config/database');

const updateSchema = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Updating activity_log table schema...');
    await client.query('BEGIN');

    // Add user_id column if it doesn't exist
    await client.query(`
      ALTER TABLE activity_log 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    `);

    // Make admin_id nullable (if it isn't already, though PostgreSQL default is nullable)
    // checking if constraint exists or just doing it
    await client.query(`
      ALTER TABLE activity_log 
      ALTER COLUMN admin_id DROP NOT NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Schema updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating schema:', error.message);
  } finally {
    client.release();
    process.exit();
  }
};

updateSchema();

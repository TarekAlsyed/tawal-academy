const pool = require('./config/database');

const fixDbSchema = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Checking and fixing database schema...');
    
    await client.query('BEGIN');

    // 1. Add phone column to users table if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);
    console.log('✅ Checked/Added phone column to users table');

    // 2. Add permissions_detailed column to admins table if it doesn't exist
    await client.query(`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS permissions_detailed JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Checked/Added permissions_detailed column to admins table');

    // 3. Ensure total_points is not null and has default 0
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN total_points SET DEFAULT 0;
      
      UPDATE users SET total_points = 0 WHERE total_points IS NULL;
    `);
    console.log('✅ Ensured total_points has default value');

    await client.query('COMMIT');
    console.log('🎉 Database schema fix completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing database schema:', error.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
};

fixDbSchema();

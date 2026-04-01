const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
  try {
    console.log('--- Checking Subjects Cover Images ---');
    const subjects = await pool.query('SELECT id, name, cover_image FROM subjects LIMIT 20');
    console.table(subjects.rows);

    console.log('\n--- Checking Auto Saved Images ---');
    try {
        const autoSaved = await pool.query('SELECT * FROM auto_saved_images LIMIT 20');
        console.table(autoSaved.rows);
    } catch (e) {
        console.log('Auto saved images table error (likely schema mismatch):', e.message);
    }

    await pool.end();
  } catch (err) {
    console.error('Error checking database:', err);
    process.exit(1);
  }
}

checkDatabase();

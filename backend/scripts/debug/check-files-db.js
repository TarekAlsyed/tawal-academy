const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFiles() {
  try {
    console.log('--- Checking PDFs ---');
    const pdfs = await pool.query('SELECT id, title, file_url FROM pdfs LIMIT 5');
    console.table(pdfs.rows);

    console.log('\n--- Checking Images ---');
    const images = await pool.query('SELECT id, title, file_url FROM images LIMIT 5');
    console.table(images.rows);

    console.log('\n--- Checking Subjects ---');
    const subjects = await pool.query('SELECT id, name, cover_image FROM subjects LIMIT 5');
    console.table(subjects.rows);

    await pool.end();
  } catch (err) {
    console.error('Error checking files:', err);
    process.exit(1);
  }
}

checkFiles();

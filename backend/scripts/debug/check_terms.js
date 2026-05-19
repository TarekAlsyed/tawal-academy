const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/config/database');

async function checkTerms() {
  try {
    const res = await pool.query("SELECT id, name FROM terms");
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTerms();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/config/database');

async function checkSystemErrors() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM system_errors");
    console.log('System errors count:', res.rows[0].count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSystemErrors();

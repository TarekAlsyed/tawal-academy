const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/config/database');

async function checkAdmins() {
  try {
    const res = await pool.query("SELECT * FROM admins LIMIT 1");
    console.log('Admin columns:', Object.keys(res.rows[0]));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAdmins();

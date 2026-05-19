const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/config/database');

async function testUpdate() {
  try {
    console.log('Testing update on term id 8...');
    const res = await pool.query("UPDATE terms SET is_published = NOT is_published WHERE id = 8 RETURNING *");
    console.log('Update successful:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

testUpdate();

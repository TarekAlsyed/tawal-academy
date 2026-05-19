const pool = require('./src/config/database');

async function listUsers() {
  try {
    const result = await pool.query('SELECT id, name, email, device_id, last_login FROM users ORDER BY last_login DESC LIMIT 10');
    console.log('Recent users:', JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

listUsers();

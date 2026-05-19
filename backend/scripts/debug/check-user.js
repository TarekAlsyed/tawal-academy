const pool = require('./src/config/database');

async function checkUser(email) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      console.log('User found:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

const email = process.argv[2] || 'test@gmail.com';
checkUser(email);

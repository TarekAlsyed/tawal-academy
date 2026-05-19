const pool = require('./src/config/database');

async function resetTarekDevices() {
  try {
    const result = await pool.query(
      "UPDATE users SET device_id = NULL WHERE email ILIKE '%tarek%'"
    );
    console.log(`Reset device_id for ${result.rowCount} users.`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetTarekDevices();

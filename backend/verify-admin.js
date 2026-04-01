const pool = require('./src/config/database');

async function verifyAdmins() {
  try {
    const result = await pool.query('SELECT id, name, email FROM admins');
    console.log('--- Admins in Database ---');
    if (result.rows.length === 0) {
      console.log('❌ No admins found in database.');
    } else {
      result.rows.forEach(admin => {
        console.log(`ID: ${admin.id} | Name: ${admin.name} | Email: ${admin.email}`);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fetching admins:', error.message);
    process.exit(1);
  }
}

verifyAdmins();

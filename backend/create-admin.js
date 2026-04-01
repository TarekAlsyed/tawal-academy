const Admin = require('./src/models/Admin');
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createDefaultAdmin() {
  try {
    const email = 'admin@tawal.com';
    const password = 'TawalAdmin2026';
    const hashedPassword = await bcrypt.hash(password, 12); // Elite Defense: 12 rounds

    // Check if admin exists
    const existingAdmin = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);

    if (existingAdmin.rows.length > 0) {
      // Update password for existing admin
      await pool.query('UPDATE admins SET password = $1 WHERE email = $2', [hashedPassword, email]);
      console.log('🔄 Admin password updated successfully!');
    } else {
      // Create new admin
      await Admin.create(
        'Tawal Academy Admin',
        email,
        password,
        {
          subjects: true,
          exams: true,
          students: true,
          questions: true,
          stats: true
        },
        true // Super Admin
      );
      console.log('✅ Default admin account created successfully!');
    }

    console.log('📧 Email: ' + email);
    console.log('🔑 Password: ' + password);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating admin:', error);
    process.exit(1);
  }
}

createDefaultAdmin();



const pool = require('./src/config/database');

async function debugPermissions() {
  try {
    const res = await pool.query('SELECT id, name, email, permissions, permissions_detailed, is_super_admin FROM admins');
    
    console.log('--- ADMINS DUMP ---');
    res.rows.forEach(admin => {
      console.log(`\n[ID: ${admin.id}] ${admin.name} (${admin.email})`);
      console.log('Super Admin:', admin.is_super_admin);
      console.log('Old Permissions:', admin.permissions);
      console.log('Detailed Permissions (Raw):', admin.permissions_detailed);
      
      try {
        const detailed = typeof admin.permissions_detailed === 'string' 
          ? JSON.parse(admin.permissions_detailed) 
          : admin.permissions_detailed;
        console.log('Detailed Permissions (Parsed):', JSON.stringify(detailed, null, 2));
        
        // Check specifically for subjects.add
        if (detailed && detailed.subjects) {
             console.log('subjects.add:', detailed.subjects.add);
        } else {
             console.log('subjects section missing in detailed permissions');
        }

      } catch (e) {
        console.log('Error parsing detailed permissions:', e.message);
      }
    });
    console.log('\n-------------------');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

debugPermissions();

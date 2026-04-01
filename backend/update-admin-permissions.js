const pool = require('./src/config/database');

async function updatePermissions() {
    const adminId = 8;
    
    // Fetch current permissions
    const res = await pool.query('SELECT permissions_detailed FROM admins WHERE id = $1', [adminId]);
    let permissions = res.rows[0].permissions_detailed;
    
    if (typeof permissions === 'string') permissions = JSON.parse(permissions);
    
    // Update subjects.add to allow with approval
    if (!permissions.subjects) permissions.subjects = {};
    permissions.subjects.add = { allowed: true, requireApproval: true };
    
    // Update DB
    await pool.query('UPDATE admins SET permissions_detailed = $1 WHERE id = $2', [JSON.stringify(permissions), adminId]);
    
    console.log('Updated permissions for Admin 8: subjects.add = { allowed: true, requireApproval: true }');
    pool.end();
}

updatePermissions();

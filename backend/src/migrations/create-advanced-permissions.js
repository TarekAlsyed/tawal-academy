const pool = require('../config/database');

const createAdvancedPermissionsSystem = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. تحديث جدول admins
    await client.query(`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS permissions_detailed JSONB DEFAULT '{}'::jsonb
    `);

    // 2. إنشاء جدول pending_approvals
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_approvals (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. تحديث جدول subjects
    await client.query(`
      ALTER TABLE subjects 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);

    // 4. تحديث جدول exams
    await client.query(`
      ALTER TABLE exams 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);

    // 5. إنشاء indexes للأداء
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pending_approvals_status 
      ON pending_approvals(status);
      
      CREATE INDEX IF NOT EXISTS idx_pending_approvals_admin 
      ON pending_approvals(admin_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Advanced permissions system created!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// تشغيل Migration
createAdvancedPermissionsSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

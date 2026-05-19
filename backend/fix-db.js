require('dotenv').config();
const pool = require('./src/config/database');

(async () => {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Add columns if they do not exist
    await client.query(`
      ALTER TABLE student_violations 
      ADD COLUMN IF NOT EXISTS exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS reported_by INTEGER REFERENCES admins(id),
      ADD COLUMN IF NOT EXISTS action_taken TEXT;
    `);
    
    console.log('✅ Fixed student_violations schema');
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing schema:', err);
    process.exit(1);
  }
})();

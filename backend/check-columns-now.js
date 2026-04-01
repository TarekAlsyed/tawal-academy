const pool = require('./src/config/database');

async function checkColumns() {
  const tables = ['exams', 'exam_progress'];
  for (const table of tables) {
    console.log(`Checking columns for table: ${table}`);
    try {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.table(res.rows);
    } catch (err) {
      console.error(`Error checking table ${table}:`, err.message);
    }
  }
  process.exit(0);
}

checkColumns();

require('dotenv').config();
const pool = require('./src/config/database');

async function checkErrors() {
  try {
    const result = await pool.query(`
      SELECT error_type, message, stack_trace, component, severity, last_occurrence, repetition_count 
      FROM system_errors 
      ORDER BY last_occurrence DESC 
      LIMIT 5
    `);
    
    console.log('--- Last 5 System Errors ---');
    result.rows.forEach((err, i) => {
      console.log(`\n[${i+1}] ${err.error_type} (${err.severity}) at ${err.last_occurrence}`);
      console.log(`Message: ${err.message}`);
      console.log(`Component: ${err.component}`);
      console.log(`Reps: ${err.repetition_count}`);
      if (err.stack_trace) {
        console.log(`Stack: ${err.stack_trace.substring(0, 300)}...`);
      }
    });
  } catch (err) {
    console.error('Failed to fetch errors:', err.message);
  } finally {
    process.exit();
  }
}

checkErrors();

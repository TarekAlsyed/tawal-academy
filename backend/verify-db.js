const { Pool } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

try {
  const maskedUrl = url.replace(/\/\/.*:.*@/, '//****:****@');
  console.log('🔍 Connecting to:', maskedUrl);
  
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Connection failed:', err.message);
      if (err.hostname) console.error('📍 Hostname:', err.hostname);
    } else {
      console.log('✅ Connection successful at:', res.rows[0].now);
    }
    pool.end();
  });
} catch (e) {
  console.error('❌ Parsing error:', e.message);
}

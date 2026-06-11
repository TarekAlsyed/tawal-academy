const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.kswhorsmpapwsfzrvqrn:Ww0566861863$@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function checkLogs() {
    try {
        const res = await pool.query(`SELECT * FROM security_audit_logs ORDER BY created_at DESC LIMIT 5`);
        console.log("Latest Security Logs:");
        res.rows.forEach(row => {
            console.log(row);
        });
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

checkLogs();

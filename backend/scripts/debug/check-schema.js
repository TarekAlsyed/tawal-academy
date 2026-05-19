const pool = require('./src/config/database');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exam_attempts'")
    .then(r => {
        console.table(r.rows);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

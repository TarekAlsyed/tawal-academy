const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const backupDatabase = () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not defined');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    console.log(`🚀 Starting database backup to ${backupFile}...`);
    
    // Using pg_dump for PostgreSQL
    const command = `pg_dump "${dbUrl}" > "${backupFile}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Backup failed: ${error.message}`);
            return;
        }
        if (stderr) {
            console.warn(`⚠️ Backup warning: ${stderr}`);
        }
        console.log(`✅ Backup completed successfully: ${backupFile}`);
    });
};

backupDatabase();

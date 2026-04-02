const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const pool = require('./backend/src/config/database');

async function updateSchema() {
    try {
        console.log('🚀 البدء في تحديث هيكل جدول الترمات...');
        
        // التحقق من وجود العمود
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'terms' AND column_name = 'is_published'
        `);

        if (checkColumn.rows.length === 0) {
            console.log('➕ إضافة عمود is_published...');
            await pool.query(`ALTER TABLE terms ADD COLUMN is_published BOOLEAN DEFAULT TRUE`);
            console.log('✅ تم إضافة العمود بنجاح.');
        } else {
            console.log('ℹ️ عمود is_published موجود بالفعل.');
        }

        console.log('✨ تم تحديث قاعدة البيانات بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تحديث قاعدة البيانات:', error);
    } finally {
        pool.end();
    }
}

updateSchema();

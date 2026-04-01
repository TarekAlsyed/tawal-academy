const pool = require('../src/config/database');

/**
 * Script to verify the latest uploaded images in the permanent storage table
 */
const verifyLatestImages = async () => {
    try {
        console.log('🔍 جاري التحقق من آخر الصور المرفوعة في قاعدة البيانات...');
        
        // 1. Check permanent_images table (The Elite system we just built)
        const permanentResult = await pool.query(`
            SELECT id, cloudinary_url, status, last_checked, created_at 
            FROM permanent_images 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('\n--- [ Elite Permanent Storage (جدول الحفظ الدائم) ] ---');
        if (permanentResult.rows.length > 0) {
            permanentResult.rows.forEach(row => {
                console.log(`✅ ID: ${row.id} | Status: ${row.status} | Created: ${row.created_at}`);
                console.log(`🔗 URL: ${row.cloudinary_url}`);
                console.log('----------------------------------------------------');
            });
        } else {
            console.log('❌ لا توجد بيانات في جدول permanent_images حتى الآن.');
        }

        // 2. Check auto_saved_images table (The local backup system)
        const autoSaveResult = await pool.query(`
            SELECT id, original_filename, saved_path, created_at 
            FROM auto_saved_images 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('\n--- [ Auto Saved Images (النسخ الاحتياطي المحلي) ] ---');
        if (autoSaveResult.rows.length > 0) {
            autoSaveResult.rows.forEach(row => {
                console.log(`✅ ID: ${row.id} | Filename: ${row.original_filename} | Created: ${row.created_at}`);
                console.log(`📂 Path: ${row.saved_path}`);
                console.log('----------------------------------------------------');
            });
        } else {
            console.log('❌ لا توجد بيانات في جدول auto_saved_images حتى الآن.');
        }

        // 3. Check subjects table (The final link to the course)
        const subjectsResult = await pool.query(`
            SELECT id, name, cover_image FROM subjects 
            WHERE cover_image LIKE 'http%' 
            ORDER BY created_at DESC 
            LIMIT 3
        `);

        console.log('\n--- [ Subjects Link (الربط بالمواد الدراسية) ] ---');
        if (subjectsResult.rows.length > 0) {
            subjectsResult.rows.forEach(row => {
                console.log(`✅ Subject: ${row.name} | Cover: ${row.cover_image}`);
            });
        } else {
            console.log('ℹ️ لم يتم ربط صور Cloudinary بمواد دراسية حتى الآن (أو لم يتم تحديثها).');
        }

    } catch (error) {
        console.error('❌ خطأ أثناء فحص قاعدة البيانات:', error.message);
    } finally {
        process.exit(0);
    }
};

verifyLatestImages();

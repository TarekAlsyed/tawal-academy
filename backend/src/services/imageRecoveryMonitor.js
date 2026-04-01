const pool = require('../config/database');
const ImageStorageService = require('../services/imageStorageService');

class ImageRecoveryMonitor {
    /**
     * Periodically checks images for integrity
     */
    static async startMonitoring(intervalMs = 3600000) { // Default every hour
        console.log(`[ImageRecoveryMonitor] Started monitoring images every ${intervalMs / 1000}s`);
        
        setInterval(async () => {
            await this.checkAllImages();
        }, intervalMs);
    }

    /**
     * Check all images that haven't been checked recently
     */
    static async checkAllImages(limit = 10) {
        try {
            console.log(`[ImageRecoveryMonitor] Starting periodic integrity check (limit: ${limit})...`);
            
            // Get oldest checked images
            const query = `
                SELECT id FROM permanent_images 
                WHERE status = 'active' 
                ORDER BY last_checked ASC NULLS FIRST 
                LIMIT $1
            `;
            
            const result = await pool.query(query, [limit]);
            
            for (const row of result.rows) {
                console.log(`[ImageRecoveryMonitor] Checking image ID: ${row.id}`);
                await ImageStorageService.recoverImage(row.id);
            }
            
            console.log(`[ImageRecoveryMonitor] Periodic check complete.`);
        } catch (error) {
            console.error('[ImageRecoveryMonitor] Error during check:', error.message);
        }
    }
}

module.exports = ImageRecoveryMonitor;

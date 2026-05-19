const cloudinary = require('../config/cloudinary');
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ImageStorageService {
    /**
     * Upload an image to Cloudinary and store it permanently in the database
     * @param {Object} file - The file object from multer or a local path
     * @param {String} folder - Cloudinary folder name
     * @returns {Object} The saved image data
     */
    static async uploadAndSavePermanently(file, folder = 'tawal_academy_permanent', applyWatermark = true) {
        try {
            // 1. Upload to Cloudinary with optimization and optional watermark
            const transformation = [
                { width: 1200, crop: "limit" }, // Resize if too large
                { quality: "auto", fetch_format: "auto" } // Best performance
            ];

            if (applyWatermark) {
                // Diagonal Text Watermark: "Tawal Academy"
                // l_text: font_size:text, g_center, o_opacity, a_angle
                transformation.push({
                    overlay: {
                        font_family: "Arial",
                        font_size: 40,
                        font_weight: "bold",
                        text: "Tawal Academy"
                    },
                    gravity: "center",
                    opacity: 20,
                    angle: -30,
                    color: "black"
                });
            }

            const uploadResult = await cloudinary.uploader.upload(file.path || file, {
                folder: folder,
                transformation: transformation
            });

            // 2. Prepare local backup if needed
            const backupPath = await this.saveLocalBackup(file);

            // 3. Store in PostgreSQL for permanent recovery
            const query = `
                INSERT INTO permanent_images 
                (cloudinary_public_id, cloudinary_url, backup_url, file_name, file_size, mime_type, folder, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                uploadResult.public_id,
                uploadResult.secure_url,
                backupPath,
                file.originalname || path.basename(file.path || file),
                uploadResult.bytes,
                uploadResult.format,
                folder,
                JSON.stringify({
                    version: uploadResult.version,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    resource_type: uploadResult.resource_type
                })
            ];

            const result = await pool.query(query, values);
            
            // Log to activity log
            await this.logImageAction('upload', result.rows[0].id, { public_id: uploadResult.public_id });

            return result.rows[0];
        } catch (error) {
            console.error('[ImageStorageService] Upload Failed:', error);
            throw error;
        }
    }

    /**
     * Save a copy of the image to the local persistent storage
     */
    static async saveLocalBackup(file) {
        try {
            const backupDir = path.join(__dirname, '../../uploads/permanent_storage/images');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const fileName = `permanent-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname || file.path || '')}`;
            const fullPath = path.join(backupDir, fileName);

            if (file.path) {
                fs.copyFileSync(file.path, fullPath);
            } else if (typeof file === 'string' && fs.existsSync(file)) {
                fs.copyFileSync(file, fullPath);
            }

            return `/uploads/permanent_storage/images/${fileName}`;
        } catch (error) {
            console.error('[ImageStorageService] Backup Failed:', error.message);
            return null;
        }
    }

    /**
     * Recovery mechanism: Verifies if a Cloudinary image is still accessible
     * If not, it attempts to recover from backup or re-upload
     */
    static async recoverImage(imageId) {
        try {
            const result = await pool.query('SELECT * FROM permanent_images WHERE id = $1', [imageId]);
            if (result.rows.length === 0) return null;

            const image = result.rows[0];
            
            // Check if Cloudinary URL is still alive
            try {
                await axios.head(image.cloudinary_url);
                await pool.query('UPDATE permanent_images SET last_checked = CURRENT_TIMESTAMP, status = $1 WHERE id = $2', ['active', imageId]);
                return image;
            } catch (error) {
                console.warn(`[Recovery] Image ${imageId} is broken at Cloudinary. Attempting recovery...`);
                
                // If broken, try to re-upload from local backup
                if (image.backup_url) {
                    const localPath = path.join(__dirname, '../../', image.backup_url);
                    if (fs.existsSync(localPath)) {
                        const newUpload = await this.uploadAndSavePermanently({ path: localPath, originalname: image.file_name }, image.folder);
                        
                        // Update the old record or mark it as recovered
                        await pool.query('UPDATE permanent_images SET status = $1, metadata = metadata || $2 WHERE id = $3', 
                            ['recovered', JSON.stringify({ recovered_to_id: newUpload.id }), imageId]);
                        
                        return newUpload;
                    }
                }
                
                await pool.query('UPDATE permanent_images SET status = $1 WHERE id = $2', ['broken', imageId]);
                throw new Error('Could not recover image from any source');
            }
        } catch (error) {
            console.error('[ImageStorageService] Recovery Failed:', error.message);
            return null;
        }
    }

    /**
     * Log actions for audit
     */
    static async logImageAction(action, imageId, details) {
        try {
            await pool.query(
                'INSERT INTO activity_log (action, details) VALUES ($1, $2)',
                [`image_${action}`, JSON.stringify({ image_id: imageId, ...details })]
            );
        } catch (e) {
            console.error('Audit Log Failed:', e.message);
        }
    }
}

module.exports = ImageStorageService;

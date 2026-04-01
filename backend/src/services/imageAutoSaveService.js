const fs = require('fs');
const path = require('path');
const AutoSavedImage = require('../models/AutoSavedImage');

class ImageAutoSaveService {
  constructor() {
    // In production (Fly.io), we use the mounted volume /app/uploads
    const baseDir = (process.env.NODE_ENV === 'production' && fs.existsSync('/app/uploads'))
      ? '/app/uploads'
      : path.join(__dirname, '../../uploads');

    this.permanentDir = path.join(baseDir, 'permanent_storage/images');
    this.permanentAudioDir = path.join(baseDir, 'permanent_storage/audio');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.permanentDir)) {
      fs.mkdirSync(this.permanentDir, { recursive: true });
    }
    if (!fs.existsSync(this.permanentAudioDir)) {
      fs.mkdirSync(this.permanentAudioDir, { recursive: true });
    }
  }

  /**
   * Automatically saves an image or audio to permanent storage
   * @param {Object} file - Multer file object
   * @param {Object} options - metadata like type, source, priority
   */
  async autoSave(file, options = {}) {
    try {
      if (!file) return null;

      const isAudio = file.mimetype.startsWith('audio/');
      const targetDir = isAudio ? this.permanentAudioDir : this.permanentDir;
      const type = options.type || this.determineFileType(file);
      const source = options.source || 'unknown';
      const priority = options.priority || this.determinePriority(type);
      const metadata = options.metadata || {};

      const originalFilename = file.originalname;
      const originalPath = file.path;
      const fileExt = path.extname(file.filename);
      const prefix = isAudio ? 'perm-audio-' : 'permanent-';
      const newFilename = `${prefix}${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
      const savedPath = path.join(targetDir, newFilename);

      // Copy file to permanent storage
      fs.copyFileSync(originalPath, savedPath);

      const dbSavedPath = isAudio 
        ? `/uploads/permanent_storage/audio/${newFilename}`
        : `/uploads/permanent_storage/images/${newFilename}`;

      // Save record to database
      const savedRecord = await AutoSavedImage.create({
        originalFilename,
        originalPath: `/uploads/${path.basename(path.dirname(originalPath))}/${path.basename(originalPath)}`,
        savedPath: dbSavedPath,
        imageType: type,
        source,
        priority,
        metadata: {
          ...metadata,
          mimetype: file.mimetype,
          size: file.size,
          original_name: originalFilename,
          is_audio: isAudio
        }
      });

      console.log(`[AutoSave] Successfully saved ${isAudio ? 'audio' : 'image'}: ${originalFilename} to ${savedPath}`);
      return savedRecord;
    } catch (error) {
      console.error('[AutoSave Error]', error);
      return null;
    }
  }

  determineFileType(file) {
    if (file.mimetype.startsWith('audio/')) return 'background_audio';
    if (file.fieldname === 'cover') return 'subject_cover';
    if (file.fieldname === 'profile') return 'user_profile';
    if (file.fieldname === 'images') return 'general_upload';
    return 'other';
  }

  determinePriority(type) {
    switch (type) {
      case 'subject_cover':
        return 1; // High
      case 'user_profile':
        return 2; // Medium
      default:
        return 3; // Low
    }
  }

  /**
   * Self-healing: Check if original files are missing and restore them from permanent storage
   */
  async healFileSystem() {
    console.log('🛡️ بدء عملية الفحص الذاتي وإصلاح نظام الملفات...');
    const images = await AutoSavedImage.findAll();
    let healedCount = 0;
    
    const baseDir = (process.env.NODE_ENV === 'production' && fs.existsSync('/app/uploads'))
      ? '/app/uploads'
      : path.join(__dirname, '../../uploads');

    for (const img of images) {
      const originalPath = path.join(baseDir, img.original_path.replace('/uploads/', ''));
      const permanentPath = path.join(baseDir, img.saved_path.replace('/uploads/', ''));

      if (!fs.existsSync(originalPath) && fs.existsSync(permanentPath)) {
        try {
          const originalDir = path.dirname(originalPath);
          if (!fs.existsSync(originalDir)) {
            fs.mkdirSync(originalDir, { recursive: true });
          }
          fs.copyFileSync(permanentPath, originalPath);
          healedCount++;
          console.log(`✅ تم استعادة الملف المفقود: ${img.original_path}`);
        } catch (err) {
          console.error(`❌ فشل استعادة الملف ${img.original_path}:`, err.message);
        }
      }
    }
    
    console.log(`🛡️ انتهى الفحص. تم إصلاح ${healedCount} ملف مفقود.`);
    return healedCount;
  }

  async getSavedImages() {
    return await AutoSavedImage.findAll();
  }

  async getStats() {
    const images = await AutoSavedImage.findAll();
    const stats = {
      total: images.length,
      byType: {},
      byPriority: {
        1: 0,
        2: 0,
        3: 0
      }
    };

    images.forEach(img => {
      stats.byType[img.image_type] = (stats.byType[img.image_type] || 0) + 1;
      stats.byPriority[img.priority] = (stats.byPriority[img.priority] || 0) + 1;
    });

    return stats;
  }
}

module.exports = new ImageAutoSaveService();

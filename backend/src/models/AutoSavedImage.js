const pool = require('../config/database');

class AutoSavedImage {
  static async create({ originalFilename, originalPath, savedPath, imageType, source, priority, metadata }) {
    const query = `
      INSERT INTO auto_saved_images (original_filename, original_path, saved_path, image_type, source, priority, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [originalFilename, originalPath, savedPath, imageType, source, priority || 2, metadata || {}];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM auto_saved_images ORDER BY created_at DESC');
    return rows;
  }

  static async findByType(type) {
    const { rows } = await pool.query('SELECT * FROM auto_saved_images WHERE image_type = $1 ORDER BY created_at DESC', [type]);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM auto_saved_images WHERE id = $1', [id]);
    return rows[0];
  }
}

module.exports = AutoSavedImage;

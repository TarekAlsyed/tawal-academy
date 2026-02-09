const pool = require('../config/database');

class Term {
  static async create(name) {
    const result = await pool.query(
      `INSERT INTO terms (name) VALUES ($1) RETURNING *`,
      [name]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM terms ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM terms WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, updates) {
    // دعم استدعاء update(id, name) مباشرة
    if (typeof updates === 'string') {
      const result = await pool.query(
        `UPDATE terms SET name = $1 WHERE id = $2 RETURNING *`,
        [updates, id]
      );
      return result.rows[0];
    }
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of Object.keys(updates)) {
      fields.push(`${key} = $${i}`);
      values.push(updates[key]);
      i++;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE terms SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query(`DELETE FROM terms WHERE id = $1`, [id]);
    return true;
  }
}

module.exports = Term;

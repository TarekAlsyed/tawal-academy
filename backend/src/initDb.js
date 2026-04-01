const pool = require('./config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log("⏳ Checking database tables...");

    // 1. إنشاء جدول المحظورين (السبب الرئيسي للمشكلة)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_list (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. إنشاء جدول المستخدمين (للطلاب)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        google_id VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. إنشاء جدول المشرفين (للأدمن)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tables created/verified successfully!");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  } finally {
    client.release();
  }
};

module.exports = createTables;

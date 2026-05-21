/**
 * ✅ C-02: Migration to create OTP codes table for student verification
 * Run this migration to enable OTP-based student authentication
 */
const pool = require('../config/database');

const createOtpTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        attempts INT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_otp_email UNIQUE (email)
      );
      
      -- Index for fast lookups by email + expiry
      CREATE INDEX IF NOT EXISTS idx_otp_email_expires 
        ON otp_codes (email, expires_at);
      
      -- Auto-cleanup expired OTPs (optional: run via cron or pg_cron)
      -- DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
    `);
    console.log('✅ OTP codes table created successfully');
  } catch (err) {
    // Table might already exist
    if (err.code === '42P07') {
      console.log('ℹ️ OTP codes table already exists');
    } else {
      console.error('❌ Failed to create OTP table:', err.message);
    }
  }
};

module.exports = createOtpTable;

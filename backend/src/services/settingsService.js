const pool = require('../config/database');

class SettingsService {
  constructor() {
    this.settings = {};
    this.lastFetched = 0;
    this.cacheDuration = 60000; // Cache for 1 minute
  }

  async get(key, defaultValue = null) {
    await this.ensureSettings();
    const dbValue = this.settings[key];

    if (dbValue === undefined || dbValue === null) {
      return defaultValue;
    }

    // The value from DB is a string 'true' or 'false' or a boolean
    if (dbValue === 'true' || dbValue === true) return true;
    if (dbValue === 'false' || dbValue === false) return false;
    
    return dbValue;
  }

  async ensureSettings() {
    const now = Date.now();
    if (now - this.lastFetched > this.cacheDuration) {
      await this.fetchAll();
    }
  }

  async fetchAll() {
    try {
      const result = await pool.query('SELECT key, value FROM system_settings');
      this.settings = {};
      result.rows.forEach(row => {
        let val = row.value;
        // The value is stored as JSONB, e.g., '"true"' or 'true'.
        if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) { /* ignore if not valid JSON */ }
        }
        this.settings[row.key] = val;
      });
      this.lastFetched = Date.now();
      console.log('[SettingsService] Fetched and cached all system settings.');
    } catch (error) {
      console.error('[SettingsService] Failed to fetch settings:', error.message);
      // In case of error, operate with old settings to maintain stability
    }
  }

  clearCache() {
    this.lastFetched = 0;
    console.log('[SettingsService] Cache cleared.');
  }
}

module.exports = new SettingsService();

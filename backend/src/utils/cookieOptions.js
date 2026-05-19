/**
 * Centralized Cookie Security Options (Elite Defense)
 * Used by both student and admin auth controllers
 * Ensures consistent security settings across all cookie operations
 */

const getCookieOptions = (maxAge) => {
  const options = {
    httpOnly: true,           // Prevent XSS access
    secure: true,             // ALWAYS secure in production/staging for HTTPS
    sameSite: 'none',         // Required for cross-site (github.io -> alwaysdata.net)
    path: '/',                // Ensure cookie is accessible globally
    maxAge
  };

  if (process.env.NODE_ENV !== 'production') {
    options.secure = false;
    options.sameSite = 'lax';
  }

  return options;
};

// Pre-configured common cookie durations
const COOKIE_DURATIONS = {
  ACCESS_TOKEN: 15 * 60 * 1000,           // 15 minutes
  REFRESH_TOKEN: 30 * 24 * 60 * 60 * 1000, // 30 days
  DEVICE_ID: 30 * 24 * 60 * 60 * 1000      // 30 days
};

module.exports = { getCookieOptions, COOKIE_DURATIONS };

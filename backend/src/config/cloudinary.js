const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Safely configure Cloudinary without throwing errors if environment variables are missing
try {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL
    });
  } else if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } else {
    console.warn('[Cloudinary] ⚠️ Neither CLOUDINARY_URL nor CLOUDINARY_CLOUD_NAME is configured. Cloudinary uploads will use local storage fallback.');
  }
} catch (err) {
  console.warn('[Cloudinary] ⚠️ Error during Cloudinary configuration:', err.message);
}

module.exports = cloudinary;

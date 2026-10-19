const admin = require('firebase-admin');

// SECURITY FIX: Never load service account from file on disk.
// Use FIREBASE_SERVICE_ACCOUNT_JSON environment variable instead.
// Set it in your .env or deployment secrets as a JSON string.

let firebaseInitialized = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('Firebase Admin initialized successfully via environment variable.');
  } else {
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON env variable not set.');
    console.warn('[Firebase] Push notifications will be disabled.');
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize Firebase Admin:', error.message);
}

module.exports = admin;

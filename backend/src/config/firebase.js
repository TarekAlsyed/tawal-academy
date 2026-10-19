let admin = null;

try {
  admin = require('firebase-admin');
} catch (err) {
  console.warn('[Firebase] ⚠️ firebase-admin module could not be loaded:', err.message);
}

let firebaseInitialized = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson || typeof serviceAccountJson !== 'string' || !serviceAccountJson.trim()) {
    console.warn('[Firebase] ⚠️ FIREBASE_SERVICE_ACCOUNT_JSON env variable not set. Push notifications (Firebase) disabled.');
  } else {
    let serviceAccount = null;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.warn('[Firebase] ⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON (invalid JSON). Firebase disabled:', parseError.message);
    }

    if (serviceAccount && admin) {
      try {
        if (!admin.apps || admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
        }
        firebaseInitialized = true;
        console.log('Firebase Admin initialized successfully via environment variable.');
      } catch (initError) {
        console.warn('[Firebase] ⚠️ Failed to initialize Firebase Admin app. Firebase disabled:', initError.message);
      }
    }
  }
} catch (error) {
  console.warn('[Firebase] ⚠️ Unexpected error in Firebase configuration:', error.message);
}

module.exports = admin;

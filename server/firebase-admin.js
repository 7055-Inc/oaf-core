const admin = require('firebase-admin');

function initializeFirebaseAdmin() {
  try {
    return admin.app();
  } catch (error) {
    // If no default app exists, initialize one
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

// Initialize Firebase Admin and export the instance
const firebaseAdmin = initializeFirebaseAdmin();
module.exports = firebaseAdmin; 
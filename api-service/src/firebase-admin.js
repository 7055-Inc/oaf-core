const admin = require('firebase-admin');

// Single source of truth for Firebase Admin initialization
function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    return admin.app();
  } catch (error) {
    // Initialize with proper error handling and logging
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Missing required Firebase Admin environment variables');
    }

    // Properly handle the private key
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/\\n/g, '\n')  // Replace escaped newlines
      .replace(/"/g, '');     // Remove any quotes

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    };

    try {
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully');
      return app;
    } catch (initError) {
      console.error('Failed to initialize Firebase Admin SDK:', initError);
      throw initError;
    }
  }
}

// Initialize immediately and export the instance
const firebaseAdmin = initializeFirebaseAdmin();

// Export a function to get the admin instance
module.exports = () => firebaseAdmin; 
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, '..', 'service-account.json'));

// Replace newlines in private key
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin; 
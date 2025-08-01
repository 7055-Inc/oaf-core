const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function testFirebaseConfig() {
  try {
    console.log('🧪 Testing Firebase configuration...');
    
    // Check environment variables
    console.log('📋 Environment variables:');
    console.log('  - API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing');
    console.log('  - Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
    console.log('  - Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing');
    console.log('  - Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing');
    console.log('  - App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing');
    
    // Check if any required variables are missing
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('\n❌ Missing required environment variables:');
      missingVars.forEach(varName => console.log(`  - ${varName}`));
      throw new Error('Missing required Firebase environment variables');
    }
    
    // Initialize Firebase
    console.log('\n🔥 Initializing Firebase...');
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    
    console.log('✅ Firebase initialized successfully');
    console.log('✅ Auth service available');
    
    // Test configuration
    console.log('\n📊 Firebase Configuration:');
    console.log('  - Project ID:', firebaseConfig.projectId);
    console.log('  - Auth Domain:', firebaseConfig.authDomain);
    console.log('  - API Key:', firebaseConfig.apiKey ? '✅ Present' : '❌ Missing');
    
    console.log('\n🎉 Firebase configuration test passed!');
    console.log('✅ Ready to run migration scripts');
    
  } catch (error) {
    console.error('\n❌ Firebase configuration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testFirebaseConfig()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFirebaseConfig }; 
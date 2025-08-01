const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } = require('firebase/auth');
const mysql = require('mysql2/promise');
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

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.128.0.31',
  user: process.env.DB_USER || 'oafuser',
  password: process.env.DB_PASS || 'oafpass',
  database: process.env.DB_NAME || 'oaf'
};

async function migrateMeyerdirkToFirebase() {
  let connection;
  
  try {
    console.log('🚀 Starting Meyerdirk Art Firebase migration (Password Reset Method)...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Get Meyerdirk Art user data
    const [users] = await connection.execute(
      'SELECT u.id, u.username, u.wp_id, ap.customer_service_email, ap.business_name FROM users u LEFT JOIN artist_profiles ap ON u.id = ap.user_id WHERE u.wp_id = 13'
    );
    
    if (users.length === 0) {
      throw new Error('Meyerdirk Art user not found in OAF database');
    }
    
    const user = users[0];
    console.log('📋 Found user:', {
      id: user.id,
      username: user.username,
      email: user.customer_service_email,
      business_name: user.business_name
    });
    
    // Create Firebase user with a temporary password
    console.log('🔥 Creating Firebase user...');
    
    // Generate a secure temporary password that meets Firebase requirements
    const tempPassword = generateFirebaseCompatiblePassword();
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.customer_service_email,
        tempPassword
      );
      
      console.log('✅ Firebase user created successfully');
      console.log('🆔 Firebase UID:', userCredential.user.uid);
      
      // Update OAF database with Firebase UID
      await connection.execute(
        'UPDATE users SET google_uid = ? WHERE id = ?',
        [userCredential.user.uid, user.id]
      );
      console.log('✅ Updated OAF database with Firebase UID');
      
      // Send password reset email immediately
      console.log('📧 Sending password reset email...');
      await sendPasswordResetEmail(auth, user.customer_service_email);
      console.log('✅ Password reset email sent successfully');
      
      // Log the migration
      await connection.execute(
        'INSERT INTO wp_artifacts (wp_id, user_id, table_name, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
        [user.wp_id, user.id, 'firebase_migration', `Firebase user created with UID: ${userCredential.user.uid}. Password reset email sent.`]
      );
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('📧 Password reset email sent to:', user.customer_service_email);
      console.log('🔑 User should check their email and set a new password');
      console.log('⚠️  Temporary password (for admin reference only):', tempPassword);
      
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-in-use') {
        console.log('⚠️  User already exists in Firebase');
        console.log('📧 Sending password reset email to existing user...');
        await sendPasswordResetEmail(auth, user.customer_service_email);
        console.log('✅ Password reset email sent to existing user');
        
        // Log the migration for existing user
        await connection.execute(
          'INSERT INTO wp_artifacts (wp_id, user_id, table_name, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
          [user.wp_id, user.id, 'firebase_migration', 'Firebase user already existed. Password reset email sent.']
        );
        
        console.log('\n🎉 Migration completed for existing Firebase user!');
        console.log('📧 Password reset email sent to:', user.customer_service_email);
      } else {
        throw firebaseError;
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

function generateFirebaseCompatiblePassword() {
  // Firebase password requirements:
  // - At least 6 characters long
  // - Must contain at least one numeric character
  // - Should be secure enough for temporary use
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Add additional random characters to make it 16 characters total
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < 16; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to make it more random
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Run the migration
if (require.main === module) {
  migrateMeyerdirkToFirebase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateMeyerdirkToFirebase }; 
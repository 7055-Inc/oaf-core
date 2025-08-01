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

async function migrateAllUsersToFirebase() {
  let connection;
  
  try {
    console.log('🚀 Starting ALL Users Firebase migration (Password Reset Method)...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Get all users that need Firebase migration
    const [users] = await connection.execute(`
      SELECT 
        u.id, 
        u.username, 
        u.wp_id, 
        u.user_type,
        u.status,
        COALESCE(ap.customer_service_email, u.username + '@placeholder.com') as email,
        COALESCE(ap.business_name, u.username) as business_name
      FROM users u 
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id 
      WHERE u.google_uid IS NULL 
      AND u.status != 'deleted'
      AND u.user_type IN ('artist', 'admin', 'promoter')
      ORDER BY u.id
    `);
    
    console.log(`📋 Found ${users.length} users to migrate`);
    
    if (users.length === 0) {
      console.log('✅ No users need migration');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process users in batches to avoid overwhelming Firebase
    const batchSize = 5;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)}`);
      
      for (const user of batch) {
        try {
          console.log(`  📝 Processing: ${user.username} (${user.email})`);
          
          // Skip users with invalid emails
          if (!isValidEmail(user.email)) {
            console.log(`  ⚠️  Skipping ${user.username} - invalid email: ${user.email}`);
            errors.push({ user: user.username, error: 'Invalid email address' });
            errorCount++;
            continue;
          }
          
          // Create Firebase user
          const tempPassword = generateFirebaseCompatiblePassword();
          
          try {
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              user.email,
              tempPassword
            );
            
            // Update OAF database with Firebase UID
            await connection.execute(
              'UPDATE users SET google_uid = ? WHERE id = ?',
              [userCredential.user.uid, user.id]
            );
            
            // Send password reset email
            await sendPasswordResetEmail(auth, user.email);
            
            // Log the migration
            await connection.execute(
              'INSERT INTO wp_artifacts (wp_id, user_id, table_name, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
              [user.wp_id, user.id, 'firebase_migration', `Firebase user created with UID: ${userCredential.user.uid}. Password reset email sent.`]
            );
            
            console.log(`  ✅ Success: ${user.username} - Firebase UID: ${userCredential.user.uid}`);
            successCount++;
            
          } catch (firebaseError) {
            if (firebaseError.code === 'auth/email-already-in-use') {
              console.log(`  ⚠️  User already exists in Firebase: ${user.username}`);
              
              // Send password reset email to existing user
              await sendPasswordResetEmail(auth, user.email);
              
              // Log the migration for existing user
              await connection.execute(
                'INSERT INTO wp_artifacts (wp_id, user_id, table_name, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
                [user.wp_id, user.id, 'firebase_migration', 'Firebase user already existed. Password reset email sent.']
              );
              
              console.log(`  ✅ Password reset sent to existing user: ${user.username}`);
              successCount++;
            } else {
              throw firebaseError;
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Error processing ${user.username}: ${error.message}`);
          errors.push({ user: user.username, error: error.message });
          errorCount++;
        }
        
        // Add delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Add delay between batches
      if (i + batchSize < users.length) {
        console.log('  ⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Final summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful migrations: ${successCount}`);
    console.log(`❌ Failed migrations: ${errorCount}`);
    console.log(`📧 Password reset emails sent: ${successCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ user, error }) => {
        console.log(`  - ${user}: ${error}`);
      });
    }
    
    // Log overall migration
    await connection.execute(
      'INSERT INTO wp_artifacts (wp_id, user_id, table_name, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
      [null, null, 'firebase_migration_bulk', `Bulk migration completed. Success: ${successCount}, Errors: ${errorCount}`]
    );
    
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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !email.includes('placeholder.com');
}

// Run the migration
if (require.main === module) {
  migrateAllUsersToFirebase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAllUsersToFirebase }; 
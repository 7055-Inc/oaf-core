const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const auth = getAuth(initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}));

(async () => {
  // Load skip list
  const skipList = new Set(
    fs.existsSync('completed_users.txt') 
      ? fs.readFileSync('completed_users.txt', 'utf8').trim().split('\n').map(e => e.trim())
      : []
  );
  
  const db = await mysql.createConnection({ host: '10.128.0.31', user: 'oafuser', password: 'oafpass', database: 'oaf' });
  const [users] = await db.execute("SELECT username FROM users WHERE status != 'deleted' AND username LIKE '%@%'");
  
  let skipped = 0, created = 0, errors = 0;
  
  for (const user of users) {
    // Check skip list BEFORE making any Firebase call
    if (skipList.has(user.username)) {
      console.log(`Skip: ${user.username}`);
      skipped++;
      continue;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, user.username, 'TempPass123!');
      console.log(`Created: ${user.username}`);
      created++;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`Exists: ${user.username}`);
        skipped++;
      } else {
        console.log(`Error: ${user.username} - ${err.code}`);
        errors++;
      }
    }
    await new Promise(r => setTimeout(r, 10000)); // 10 seconds = safer
  }
  
  console.log(`\n✅ Done: ${created} created, ${skipped} skipped, ${errors} errors`);
  await db.end();
})();


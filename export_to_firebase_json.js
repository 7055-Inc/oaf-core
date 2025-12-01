const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportToJSON() {
  const connection = await mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf'
  });

  const [users] = await connection.execute(`
    SELECT username, email_verified, status, id
    FROM users 
    WHERE google_uid IS NULL 
    AND status != 'deleted'
    AND username LIKE '%@%'
    ORDER BY id
  `);

  const firebaseUsers = {
    users: users.map(user => ({
      localId: `imported_${user.id}`,
      email: user.username,
      emailVerified: user.email_verified === 'yes',
      disabled: false,
      displayName: user.username,
      passwordHash: Buffer.from('tempPassword123!').toString('base64') // Placeholder - Firebase will require password reset
    }))
  };

  fs.writeFileSync('firebase_users.json', JSON.stringify(firebaseUsers, null, 2));
  console.log(`✅ Exported ${users.length} users to firebase_users.json`);
  
  await connection.end();
}

exportToJSON().catch(console.error);

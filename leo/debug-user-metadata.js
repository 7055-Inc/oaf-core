#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function debugUserMetadata() {
  const dbConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'oaf'
  });

  const [users] = await dbConnection.execute(`
    SELECT 
      u.id,
      u.username,
      u.created_at,
      u.last_login
    FROM users u
    LIMIT 1
  `);

  const user = users[0];
  
  console.log('Raw user data:');
  console.log(JSON.stringify(user, null, 2));
  
  console.log('\nChecking each field type:');
  for (const [key, value] of Object.entries(user)) {
    const type = typeof value;
    const isNull = value === null;
    const isDate = value instanceof Date;
    console.log(`- ${key}: ${type}${isNull ? ' (null)' : ''}${isDate ? ' (Date object!)' : ''} = ${value}`);
  }
  
  await dbConnection.end();
}

debugUserMetadata().catch(console.error);


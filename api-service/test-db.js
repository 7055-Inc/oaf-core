const db = require('./config/db');

async function testDb() {
  try {
    console.log('Database configuration:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: 'oaf'
    });
    const [rows] = await db.query('SELECT 1 AS test');
    console.log('Database connection successful:', rows);
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    process.exit();
  }
}

testDb(); 
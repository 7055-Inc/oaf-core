import mysql from 'mysql2/promise';
import { jwtVerify } from 'jose';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'oaf',
});

export async function getUser(token) {
  try {
    // Convert JWT_SECRET to Uint8Array for jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    // Verify and decode the JWT token using jose
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId) {
      return null;
    }

    // Get user from database
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.userId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

export { pool };
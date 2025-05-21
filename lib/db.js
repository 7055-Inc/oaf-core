import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'oaf',
});

export async function getUser(userId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  return rows[0];
} 
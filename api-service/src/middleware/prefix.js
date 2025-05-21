const db = require('../../config/db');
const bcrypt = require('bcryptjs');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No API key' });
  const [publicKey, privateKey] = authHeader.split(':');
  const [key] = await db.query('SELECT private_key_hashed, prefix FROM api_keys WHERE public_key = ?', [publicKey]);
  if (!key.length || !publicKey.startsWith(key[0].prefix)) return res.status(401).json({ error: 'Invalid API key' });
  if (!bcrypt.compareSync(privateKey, key[0].private_key_hashed)) return res.status(401).json({ error: 'Invalid private key' });
  next();
}; 
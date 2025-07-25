const db = require('../../config/db');
const bcrypt = require('bcryptjs');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No API key' });
  
  const [publicKey, privateKey] = authHeader.split(':');
  
  try {
    const [key] = await db.query(
      'SELECT user_id, private_key_hashed, prefix, is_active FROM api_keys WHERE public_key = ?', 
      [publicKey]
    );
    
    if (!key.length) return res.status(401).json({ error: 'Invalid API key' });
    if (!key[0].is_active) return res.status(401).json({ error: 'API key is disabled' });
    if (!publicKey.startsWith(key[0].prefix)) return res.status(401).json({ error: 'Invalid API key' });
    if (!bcrypt.compareSync(privateKey, key[0].private_key_hashed)) return res.status(401).json({ error: 'Invalid private key' });
    
    // Set user context (simple - just the API key owner)
    req.userId = key[0].user_id;
    
    // Update last_used_at
    await db.query('UPDATE api_keys SET last_used_at = NOW() WHERE public_key = ?', [publicKey]);
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'API key validation failed' });
  }
}; 
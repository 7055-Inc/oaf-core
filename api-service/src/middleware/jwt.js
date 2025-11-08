const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    req.permissions = decoded.permissions || [];
    
    // Handle impersonation context
    if (decoded.isImpersonating) {
      req.isImpersonating = true;
      req.originalUserId = decoded.originalUserId;
      req.impersonationLogId = decoded.impersonationLogId;
      req.impersonatedUsername = decoded.username;
    } else {
      req.isImpersonating = false;
      req.originalUserId = null;
    }
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}; 
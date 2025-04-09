const coopMiddleware = (req, res, next) => {
  // For auth-related routes, use permissive settings
  if (req.path.startsWith('/auth/') || req.path.startsWith('/oauth/')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  } else {
    // For all other routes, use strict settings
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  next();
};

module.exports = {
  coopMiddleware
}; 
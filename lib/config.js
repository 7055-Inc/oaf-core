/**
 * Configuration utilities for Brakebee.com
 * Centralized environment variable management for frontend
 */

// Environment variables with fallbacks
export const config = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com',
  API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  
  // Frontend URLs
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com',
  MOBILE_APP_URL: process.env.NEXT_PUBLIC_MOBILE_APP_URL || 'https://mobile.brakebee.com',
  
  // Subdomain Configuration (for artist sites)
  SUBDOMAIN_BASE: process.env.NEXT_PUBLIC_SUBDOMAIN_BASE || 'brakebee.com',
  
  // Media & Images
  SMART_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_SMART_MEDIA_BASE_URL || '',
  
  // Cookie & Security
  COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.brakebee.com',
  CSRF_ENABLED: process.env.NEXT_PUBLIC_CSRF_ENABLED === 'true',
  
  // Environment
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
  IS_PRODUCTION: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  IS_DEVELOPMENT: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  
  // Port (server-side only)
  PORT: process.env.PORT || 3000,
};

// Helper functions
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
};

export const getFrontendUrl = (path = '') => {
  const baseUrl = config.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Build smart-serve URL for an image path or media ID.
 * @param {string} imagePath - Relative path, media ID, or full URL
 * @param {string} [size] - Optional size for smart serve (e.g. 'thumbnail', 'detail', 'large')
 */
export const getSmartMediaUrl = (imagePath = '', size = '') => {
  if (!imagePath) return '';
  let url;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    url = imagePath;
  } else if (imagePath.startsWith('/temp_images/') || imagePath.startsWith('temp_images/')) {
    const apiBase = config.API_BASE_URL.replace(/\/$/, '');
    const cleanPath = imagePath.replace(/^\//, '');
    url = `${apiBase}/${cleanPath}`;
  } else {
    const baseUrl = config.SMART_MEDIA_BASE_URL.replace(/\/$/, '');
    const cleanPath = imagePath.replace(/^\//, '');
    url = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
  }
  if (size) {
    url += url.includes('?') ? `&size=${encodeURIComponent(size)}` : `?size=${encodeURIComponent(size)}`;
  }
  return url;
};

export const getMobileAppUrl = (path = '') => {
  const baseUrl = config.MOBILE_APP_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// Get subdomain URL for artist sites
export const getSubdomainUrl = (subdomain, path = '') => {
  const base = config.SUBDOMAIN_BASE;
  const cleanPath = path.replace(/^\//, '');
  const url = `https://${subdomain}.${base}`;
  return cleanPath ? `${url}/${cleanPath}` : url;
};

// Get the subdomain base domain (without protocol)
export const getSubdomainBase = () => config.SUBDOMAIN_BASE;

// Cookie configuration helper
export const getCookieConfig = () => ({
  domain: config.COOKIE_DOMAIN,
  secure: config.ENVIRONMENT !== 'development',
  sameSite: 'Lax', // Lax allows OAuth redirects while still protecting against CSRF
  httpOnly: false, // Allow client-side access for frontend
});

// CORS configuration helper
export const getCorsOrigins = () => {
  if (config.IS_DEVELOPMENT) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }
  return [config.FRONTEND_URL, config.API_BASE_URL];
};

export default config;

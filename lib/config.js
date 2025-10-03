/**
 * Configuration utilities for Beemeeart.com
 * Centralized environment variable management for frontend
 */

// Environment variables with fallbacks
export const config = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.beemeeart.com',
  API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  
  // Frontend URLs
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://beemeeart.com',
  MOBILE_APP_URL: process.env.NEXT_PUBLIC_MOBILE_APP_URL || 'https://mobile.beemeeart.com',
  
  // Media & Images
  SMART_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images',
  
  // Cookie & Security
  COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.beemeeart.com',
  CSRF_ENABLED: process.env.NEXT_PUBLIC_CSRF_ENABLED === 'true',
  
  // Environment
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
  IS_PRODUCTION: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  IS_DEVELOPMENT: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
  
  // Port (server-side only)
  PORT: process.env.PORT || 3000,
};

// Legacy domain mappings for reference
export const LEGACY_DOMAINS = {
  OLD_MAIN: 'onlineartfestival.com',
  OLD_API: 'api2.onlineartfestival.com',
  OLD_MOBILE: 'mobile.onlineartfestival.com',
  OLD_MAIN_SUBDOMAIN: 'main.onlineartfestival.com',
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

export const getSmartMediaUrl = (imagePath = '') => {
  const baseUrl = config.SMART_MEDIA_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = imagePath.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

export const getMobileAppUrl = (path = '') => {
  const baseUrl = config.MOBILE_APP_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// Cookie configuration helper
export const getCookieConfig = () => ({
  domain: config.COOKIE_DOMAIN,
  secure: config.IS_PRODUCTION,
  sameSite: config.IS_PRODUCTION ? 'strict' : 'lax',
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

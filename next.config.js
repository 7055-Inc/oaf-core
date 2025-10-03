/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase the maximum payload size for API routes
  serverExternalPackages: ['formidable'],
  
  // Skip middleware URL normalization (moved out of experimental in Next.js 15+)
  skipMiddlewareUrlNormalize: true,
  
  // Environment variables configuration
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_SMART_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_SMART_MEDIA_BASE_URL,
    NEXT_PUBLIC_MOBILE_APP_URL: process.env.NEXT_PUBLIC_MOBILE_APP_URL,
    NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
    NEXT_PUBLIC_CSRF_ENABLED: process.env.NEXT_PUBLIC_CSRF_ENABLED,
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Configure API routes and CORS
  async headers() {
    const corsOrigins = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' 
      ? [process.env.NEXT_PUBLIC_FRONTEND_URL, process.env.NEXT_PUBLIC_API_BASE_URL]
      : ['*'];
    
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: corsOrigins.join(', '),
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-CSRF-Token',
          },
        ],
      },
      // Security headers for all pages
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 
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
  
  // Image optimization - enables next/image auto-optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.brakebee.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.beemeeart.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.brakebee.com',
        pathname: '/**',
      },
    ],
    // Modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Redirects for old URL patterns
  async redirects() {
    return [
      // Old /c/[slug] category URLs → redirect to marketplace
      {
        source: '/c/:slug',
        destination: '/marketplace',
        permanent: true, // 301 redirect for SEO
      },
    ];
  },

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
      // Aggressive cache-busting for auth pages (prevent old cached JS)
      {
        source: '/custom-sites/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/login',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/signup',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/forgot-password',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/user-type-selection',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year - files have hashed names
          },
        ],
      },
      // Static media caching (videos, images, etc.)
      {
        source: '/static_media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400', // 30 days, revalidate after 1 day
          },
        ],
      },
      // Public images and assets
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400', // 30 days
          },
        ],
      },
      // Favicon and other root assets
      {
        source: '/:path(.ico|.png|.jpg|.jpeg|.gif|.webp|.svg|.mp4|.webm)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400', // 30 days
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
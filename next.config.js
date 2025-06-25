/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase the maximum payload size for API routes
  serverExternalPackages: ['formidable'],
  // Configure API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 
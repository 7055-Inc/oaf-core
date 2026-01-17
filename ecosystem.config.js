module.exports = {
  apps: [
    {
      name: 'staging-frontend',
      script: 'server.js',
      cwd: '/var/www/staging',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'staging-api',
      script: 'src/server.js',
      cwd: '/var/www/staging/api-service',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        API_GATEWAY_PORT: 3003,
        API_VERSION: '1.0.0',
        API_INSTANCE: 'staging'
      }
    }
  ]
};

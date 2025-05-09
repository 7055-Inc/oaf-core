module.exports = {
  apps: [
    {
      name: 'oaf',
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'api-gateway',
      script: 'src/server.js',
      cwd: '/var/www/main/api-service',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        API_GATEWAY_PORT: 3001,
        API_VERSION: '1.0.0',
        API_INSTANCE: '0'
      }
    }
  ]
}; 
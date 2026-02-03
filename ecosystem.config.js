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
    },
    {
      name: 'staging-leo',
      script: 'src/server.js',
      cwd: '/var/www/staging/leo',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '8G',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
        SERVICE_NAME: 'leo-ai-platform'
      },
      error_file: '/var/www/staging/logs/leo-error.log',
      out_file: '/var/www/staging/logs/leo-out.log',
      log_file: '/var/www/staging/logs/leo-combined.log',
      time: true
    },
    {
      name: 'staging-sop',
      script: 'src/server.js',
      cwd: '/var/www/staging/sop',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOP_PORT: 3005
      },
      error_file: '/var/www/staging/logs/sop-error.log',
      out_file: '/var/www/staging/logs/sop-out.log',
      log_file: '/var/www/staging/logs/sop-combined.log',
      time: true
    },
    {
      name: 'staging-luca',
      script: 'src/server.js',
      cwd: '/var/www/staging/luca',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '6G',
      env_file: '/var/www/staging/luca/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      error_file: '/var/www/staging/logs/luca-error.log',
      out_file: '/var/www/staging/logs/luca-out.log',
      log_file: '/var/www/staging/logs/luca-combined.log',
      time: true
    }
    // ChromaDB runs as systemd service: sudo systemctl status chromadb
  ]
};

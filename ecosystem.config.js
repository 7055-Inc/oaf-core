module.exports = {
  apps: [
    {
      name: 'brakebee',
      script: 'server.js',
      cwd: '/var/www/main',
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
      name: 'api-service',
      script: 'src/server.js',
      cwd: '/var/www/main/api-service',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        API_GATEWAY_PORT: 3001,
        API_VERSION: '1.0.0',
        API_INSTANCE: 'main',
        DB_SSL_REJECT_UNAUTHORIZED: 'false'
      }
    },
    {
      name: 'leo',
      script: 'src/server.js',
      cwd: '/var/www/main/leo',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '8G',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        SERVICE_NAME: 'leo-ai-platform'
      },
      error_file: '/var/www/main/logs/leo-error.log',
      out_file: '/var/www/main/logs/leo-out.log',
      log_file: '/var/www/main/logs/leo-combined.log',
      time: true
    },
    {
      name: 'sop',
      script: 'src/server.js',
      cwd: '/var/www/main/sop',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOP_PORT: 3002
      },
      error_file: '/var/www/main/logs/sop-error.log',
      out_file: '/var/www/main/logs/sop-out.log',
      log_file: '/var/www/main/logs/sop-combined.log',
      time: true
    },
    {
      name: 'luca',
      script: 'src/server.js',
      cwd: '/var/www/main/luca',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '6G',
      env_file: '/var/www/main/luca/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '/var/www/main/logs/luca-error.log',
      out_file: '/var/www/main/logs/luca-out.log',
      log_file: '/var/www/main/logs/luca-combined.log',
      time: true
    },
    {
      name: 'storefront',
      script: 'node_modules/.bin/next',
      args: 'start -p 3005',
      cwd: '/var/www/main/storefront',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'csv-worker',
      script: 'csv-processor.js',
      cwd: '/var/www/main/csv-workers',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        CSV_WORKER_PORT: 3006
      }
    }
    // ChromaDB runs as systemd service: sudo systemctl status chromadb
  ]
};

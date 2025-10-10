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
        API_INSTANCE: '0'
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
      max_memory_restart: '500M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'leo-ai-platform',
      script: 'src/server.js',
      cwd: '/var/www/main/leo',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'leo-ai-platform'
      },
      error_file: '/var/www/main/logs/leo-error.log',
      out_file: '/var/www/main/logs/leo-out.log',
      log_file: '/var/www/main/logs/leo-combined.log',
      time: true
    },
    {
      name: 'luca-costing-platform',
      script: 'src/server.js',
      cwd: '/var/www/main/luca',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '/var/www/main/luca/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      error_file: '/var/www/main/logs/luca-error.log',
      out_file: '/var/www/main/logs/luca-out.log',
      log_file: '/var/www/main/logs/luca-combined.log',
      time: true
    },
    {
      name: 'chromadb',
      script: 'start-chroma.sh',
      cwd: '/var/www/main/leo',
      interpreter: '/bin/bash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        CHROMA_SERVER_CORS_ALLOW_ORIGINS: '["*"]',
        CHROMA_HOST: '0.0.0.0',
        CHROMA_PORT: '8000'
      },
      error_file: '/var/www/main/logs/chromadb-error.log',
      out_file: '/var/www/main/logs/chromadb-out.log',
      log_file: '/var/www/main/logs/chromadb-combined.log',
      time: true
    }
  ]
}; 
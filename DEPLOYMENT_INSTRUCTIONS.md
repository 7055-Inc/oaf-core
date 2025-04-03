# API Gateway Deployment Instructions

This document provides detailed step-by-step instructions for deploying the API Gateway architecture, including both the application server and database server components.

## Prerequisites

- **Operating System**: Ubuntu 20.04 LTS or newer
- **Web Server**: Nginx (version 1.18+)
- **Node.js**: Version 14+ and npm
- **Database**: PostgreSQL 12+
- **Domain Names**: Configured for both app server and DB server
- **SSL Certificates**: Valid SSL certificates for both domains

## 1. System Preparation

### 1.1 Update System and Install Required Packages

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y nginx postgresql postgresql-contrib nodejs npm certbot python3-certbot-nginx

# Verify installations
nginx -v
node -v
npm -v
psql --version
```

### 1.2 Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## 2. Database Server Setup

### 2.1 Configure PostgreSQL

```bash
# Secure the postgres user
sudo passwd postgres

# Log in as postgres user
sudo -i -u postgres

# Create the database
createdb api_gateway_db

# Connect to the database
psql -d api_gateway_db

# Create the test table
CREATE TABLE api_test (
  id SERIAL PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

# Insert initial test data
INSERT INTO api_test (is_active, message) VALUES (true, 'API Gateway is functioning correctly');

# Create API user with restricted permissions
CREATE USER api_user WITH PASSWORD 'secure_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON api_test TO api_user;
GRANT USAGE, SELECT ON SEQUENCE api_test_id_seq TO api_user;
ALTER USER api_user SET statement_timeout = '30s';
ALTER USER api_user CONNECTION LIMIT 100;
ALTER USER api_user SET search_path = public;

# Exit postgres
\q
exit
```

### 2.2 Set Up SSL Certificate for DB Server

```bash
# Get SSL certificate using certbot
sudo certbot --nginx -d db.example.com
```

### 2.3 Configure Nginx on DB Server

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/db-server.conf
```

Copy the content from `nginx_db_server.conf` and modify as needed.

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/db-server.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo nginx -s reload
```

### 2.4 Set Up DB API Service

Create a new directory for the DB API service:

```bash
mkdir -p /var/www/db-api-service
cd /var/www/db-api-service
```

Create a package.json file:

```json
{
  "name": "db-api-service",
  "version": "1.0.0",
  "description": "Database API Service",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.8.0",
    "body-parser": "^1.20.1",
    "morgan": "^1.10.0",
    "helmet": "^6.0.0",
    "express-rate-limit": "^6.6.0"
  }
}
```

Install dependencies:

```bash
npm install
```

Create the server.js file:

```javascript
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();
const PORT = 8080;

// Configure PostgreSQL connection
const pool = new Pool({
  user: 'api_user',
  host: 'localhost',
  database: 'api_gateway_db',
  password: 'secure_password_here',
  port: 5432,
});

// Apply middleware
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('combined'));

// Basic authentication middleware
const apiKeys = {
  'your_api_key_here': {
    name: 'API Gateway Service',
  }
};

const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !apiKeys[apiKey]) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'unauthorized',
        message: 'Invalid API key'
      }
    });
  }
  
  // Validate signature (implement HMAC verification here)
  
  next();
};

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(authenticate);

// API routes
app.post('/', async (req, res) => {
  try {
    const { operation, parameters } = req.body;
    let result;
    
    switch (operation) {
      case 'SELECT':
        // Handle SELECT operation
        const { table, fields, conditions } = parameters;
        const fieldsList = fields.join(', ');
        const whereClause = conditions ? 
          'WHERE ' + Object.entries(conditions)
            .map(([key, value]) => `${key} = $${Object.keys(conditions).indexOf(key) + 1}`)
            .join(' AND ') 
          : '';
        
        const selectQuery = `SELECT ${fieldsList} FROM ${table} ${whereClause}`;
        const selectResult = await pool.query(
          selectQuery, 
          conditions ? Object.values(conditions) : []
        );
        
        result = selectResult.rows[0];
        break;
      
      case 'UPDATE':
        // Handle UPDATE operation
        const { table: updateTable, values, conditions: updateConditions } = parameters;
        
        const setClause = Object.keys(values)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(', ');
        
        const whereUpdateClause = Object.keys(updateConditions)
          .map((key, index) => `${key} = $${index + Object.keys(values).length + 1}`)
          .join(' AND ');
        
        const updateQuery = `UPDATE ${updateTable} SET ${setClause} WHERE ${whereUpdateClause} RETURNING *`;
        const updateResult = await pool.query(
          updateQuery,
          [...Object.values(values), ...Object.values(updateConditions)]
        );
        
        result = updateResult.rows[0];
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'invalid_operation',
            message: `Operation ${operation} not supported`
          }
        });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'An error occurred while processing your request'
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`DB API Service running on port ${PORT}`);
});
```

Set up as a system service:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/db-api-service.service
```

Add the following content:

```
[Unit]
Description=Database API Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/db-api-service
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl start db-api-service
sudo systemctl enable db-api-service
sudo systemctl status db-api-service
```

## 3. Application Server Setup

### 3.1 Set Up SSL Certificate for App Server

```bash
# Get SSL certificate using certbot
sudo certbot --nginx -d api.example.com
```

### 3.2 Deploy the API Service

```bash
# Create the directory structure
mkdir -p /var/www/main/api-service
cd /var/www/main

# Clone the repository or copy files
# If using git:
# git clone <repository_url> .

# If manually copying:
# Copy all the necessary files to the server
```

Install dependencies:

```bash
cd /var/www/main/api-service
npm install
```

Update the configuration in `config/default.json`:

```bash
nano config/default.json
```

Set the correct values for:
- Database URL (e.g., `https://db.example.com/`)
- API key
- HMAC secret

### 3.3 Configure Nginx on App Server

```bash
# Copy the provided configuration
sudo cp /var/www/main/nginx_app_server.conf /etc/nginx/sites-available/api-gateway.conf

# Edit the configuration
sudo nano /etc/nginx/sites-available/api-gateway.conf
```

Update:
- `server_name` to your actual domain
- SSL certificate paths
- CORS headers to match your frontend domain
- Static file paths if needed

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/api-gateway.conf /etc/nginx/sites-enabled/

# Test the configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo nginx -s reload
```

### 3.4 Set Up API Service as System Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/api-gateway.service
```

Add the following content:

```
[Unit]
Description=API Gateway Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/main/api-service
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl start api-gateway
sudo systemctl enable api-gateway
sudo systemctl status api-gateway
```

### 3.5 Deploy Test Frontend

```bash
# Ensure the test frontend directory exists
mkdir -p /var/www/main/api-test

# Copy frontend files
# (These files should already be in place from the previous steps)

# Set appropriate permissions
sudo chown -R www-data:www-data /var/www/main/api-test
```

## 4. Testing and Verification

### 4.1 Test Database API Directly

```bash
# Make a direct request to the database API
curl -X POST \
  https://db.example.com/api/ \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: your_api_key_here' \
  -d '{
    "operation": "SELECT",
    "parameters": {
      "table": "api_test",
      "fields": ["id", "is_active", "message", "updated_at"],
      "conditions": {
        "id": 1
      }
    }
  }'
```

### 4.2 Test API Gateway

```bash
# Test the API Gateway endpoint
curl -X GET https://api.example.com/api/v1/test
```

### 4.3 Access the Test Frontend

Open a web browser and navigate to:
```
https://api.example.com/api-test/
```

## 5. Maintenance and Monitoring

### 5.1 Log Rotation

```bash
# Configure log rotation for API service logs
sudo nano /etc/logrotate.d/api-gateway
```

Add:
```
/var/log/nginx/api_gateway_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
```

### 5.2 Monitoring

Consider setting up monitoring with a tool like Prometheus and Grafana:

```bash
# Install Prometheus Node Exporter
sudo apt install -y prometheus-node-exporter

# Start and enable the service
sudo systemctl start prometheus-node-exporter
sudo systemctl enable prometheus-node-exporter
```

### 5.3 Backup Configuration

Set up regular backups of:
- Database data
- API configuration files
- Nginx configuration

Example database backup script:

```bash
# Create backup script
sudo nano /usr/local/bin/backup-api-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U postgres api_gateway_db > $BACKUP_DIR/api_gateway_db_$TIMESTAMP.sql
find $BACKUP_DIR -type f -mtime +7 -name "api_gateway_db_*.sql" -delete
```

Make it executable and schedule it:

```bash
sudo chmod +x /usr/local/bin/backup-api-db.sh
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-api-db.sh
```

## 6. Troubleshooting

### 6.1 API Service Issues

If the API service doesn't start:

```bash
# Check for errors in the service
sudo journalctl -u api-gateway

# Check the Node.js application logs
sudo tail -f /var/log/syslog | grep api-gateway
```

### 6.2 Nginx Issues

```bash
# Check Nginx syntax
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check API gateway access logs
sudo tail -f /var/log/nginx/api_gateway_access.log
```

### 6.3 Database Connection Issues

```bash
# Test database connection
PGPASSWORD='secure_password_here' psql -h localhost -U api_user -d api_gateway_db -c "SELECT 1"

# Check if DB API service is running
sudo systemctl status db-api-service
```

### 6.4 Common Problems and Solutions

1. **CORS Errors**:
   - Verify the `Access-Control-Allow-Origin` header in Nginx config
   - Check browser console for detailed error messages

2. **502 Bad Gateway**:
   - Ensure the Node.js service is running
   - Check port configuration in Nginx

3. **Authentication Failures**:
   - Verify the API key in configuration files
   - Check HMAC generation and verification logic

4. **SSL Certificate Issues**:
   - Renew certificates if expired: `sudo certbot renew`
   - Check certificate paths in Nginx config

## 7. Scaling and Performance

For higher traffic scenarios, consider:

1. **Load Balancing**:
   - Set up multiple API service instances
   - Configure Nginx as a load balancer

2. **Caching**:
   - Implement Redis for caching frequent requests
   - Add cache headers to appropriate API responses

3. **Connection Pooling**:
   - Optimize database connection pool settings
   - Increase `max_connections` in PostgreSQL for higher load

4. **Horizontal Scaling**:
   - Deploy additional application servers
   - Set up database replication for read scaling 
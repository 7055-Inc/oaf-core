# Application Server Implementation for API Gateway

Based on the database server configuration and communication patterns established, this document outlines the implementation steps for the application server side of our API Gateway architecture.

## Implementation Overview

We will implement:
1. Nginx configuration for the application server
2. A simple API backend service to handle the test endpoint
3. The necessary security measures for server-to-server communication
4. Frontend integration for testing

## 1. Nginx Configuration for Application Server

Create a file named `nginx_app_server.conf` with the following configuration:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com; # Replace with your actual API domain

    # SSL Configuration
    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # CORS headers for API
    add_header Access-Control-Allow-Origin "https://yourwebsite.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, X-API-Key, Content-Type" always;
    
    # Logging configuration
    access_log /var/log/nginx/api_gateway_access.log;
    error_log  /var/log/nginx/api_gateway_error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_frontend_limit:10m rate=5r/s;
    
    # API endpoints
    location /api/v1/ {
        limit_req zone=api_frontend_limit burst=10 nodelay;
        
        # Enable CORS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://yourwebsite.com';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, X-API-Key, Content-Type';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Proxy to application API handler
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 5s;
        proxy_send_timeout 20s;
        proxy_read_timeout 20s;
    }
    
    # Serve static test frontend
    location /api-test/ {
        alias /var/www/api-test/;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Block all other requests
    location / {
        return 403;
    }
}
```

## 2. API Backend Service Implementation

### 2.1 Required Files

Create a directory structure for the API service:

```
/var/www/api-service/
├── config/
│   ├── default.json
│   └── production.json
├── src/
│   ├── server.js
│   ├── routes/
│   │   └── test.js
│   ├── controllers/
│   │   └── testController.js
│   ├── services/
│   │   └── dbService.js
│   └── utils/
│       ├── authUtils.js
│       └── requestUtils.js
└── package.json
```

### 2.2 Package.json

```json
{
  "name": "api-service",
  "version": "1.0.0",
  "description": "API Gateway Backend Service",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "axios": "^0.27.2",
    "config": "^3.3.8",
    "express": "^4.18.2",
    "express-rate-limit": "^6.6.0",
    "helmet": "^6.0.0",
    "morgan": "^1.10.0",
    "winston": "^3.8.2",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

### 2.3 Configuration (config/default.json)

```json
{
  "server": {
    "port": 3000,
    "timeouts": {
      "request": 30000
    }
  },
  "database": {
    "url": "https://db.example.com/api",
    "apiKey": "your_api_key_here",
    "secret": "your_hmac_secret_here"
  },
  "security": {
    "rateLimits": {
      "windowMs": 15 * 60 * 1000,
      "max": 100
    }
  },
  "logging": {
    "level": "info"
  }
}
```

### 2.4 Main Server (src/server.js)

```javascript
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('config');
const rateLimit = require('express-rate-limit');

// Routes
const testRoutes = require('./routes/test');

// Initialize app
const app = express();

// Apply security middleware
app.use(helmet());

// Parse JSON
app.use(express.json());

// Request logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.get('security.rateLimits.windowMs'),
  max: config.get('security.rateLimits.max'),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/v1/test', testRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'server_error',
      message: 'An unexpected error occurred',
    }
  });
});

// Start server
const PORT = config.get('server.port');
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

module.exports = app;
```

### 2.5 Routes (src/routes/test.js)

```javascript
const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// GET /api/v1/test - Get current test state
router.get('/', testController.getTestState);

// PUT /api/v1/test - Update test state
router.put('/', testController.updateTestState);

module.exports = router;
```

### 2.6 Controller (src/controllers/testController.js)

```javascript
const dbService = require('../services/dbService');

exports.getTestState = async (req, res, next) => {
  try {
    const result = await dbService.executeQuery({
      operation: 'SELECT',
      parameters: {
        table: 'api_test',
        fields: ['id', 'is_active', 'message', 'updated_at'],
        conditions: {
          id: 1
        }
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching test state:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to retrieve test state'
      }
    });
  }
};

exports.updateTestState = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'invalid_request',
          message: 'is_active must be a boolean value'
        }
      });
    }
    
    const result = await dbService.executeQuery({
      operation: 'UPDATE',
      parameters: {
        table: 'api_test',
        values: {
          is_active,
          updated_at: new Date()
        },
        conditions: {
          id: 1
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        updated: true
      }
    });
  } catch (error) {
    console.error('Error updating test state:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to update test state'
      }
    });
  }
};
```

### 2.7 Database Service (src/services/dbService.js)

```javascript
const axios = require('axios');
const config = require('config');
const crypto = require('crypto');
const { generateRequestSignature } = require('../utils/authUtils');

const DB_API_URL = config.get('database.url');
const API_KEY = config.get('database.apiKey');
const API_SECRET = config.get('database.secret');

/**
 * Execute a database query through the DB server API
 * @param {Object} queryParams - The query parameters
 * @returns {Promise<Object>} - The query results
 */
exports.executeQuery = async (queryParams) => {
  try {
    const timestamp = new Date().toISOString();
    const requestBody = JSON.stringify(queryParams);
    
    // Create HMAC signature for request
    const signature = generateRequestSignature(requestBody, timestamp, API_SECRET);
    
    const response = await axios({
      method: 'post',
      url: DB_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Request-Signature': signature,
        'X-Request-Timestamp': timestamp
      },
      data: queryParams,
      timeout: config.get('server.timeouts.request')
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error.message || 'Database operation failed');
    }
  } catch (error) {
    console.error('Database service error:', error);
    throw error;
  }
};
```

### 2.8 Auth Utilities (src/utils/authUtils.js)

```javascript
const crypto = require('crypto');

/**
 * Generate HMAC signature for database request
 * @param {string} requestBody - Stringified request body
 * @param {string} timestamp - ISO timestamp
 * @param {string} secret - HMAC secret key
 * @returns {string} - HMAC signature
 */
exports.generateRequestSignature = (requestBody, timestamp, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(requestBody + timestamp);
  return hmac.digest('hex');
};
```

## 3. Frontend Test Implementation

Create a directory `/var/www/api-test/` to host the test frontend files. Implement the HTML, JavaScript and CSS files as specified in the API_TEST_FRONTEND.md document.

## 4. Testing the Implementation

1. Start the API service:
   ```bash
   cd /var/www/api-service
   npm install
   npm start
   ```

2. Reload Nginx configuration:
   ```bash
   sudo nginx -t  # Test configuration
   sudo nginx -s reload  # Apply configuration
   ```

3. Access the test frontend at https://api.example.com/api-test/

4. Verify the full flow:
   - Frontend sends request to the API Gateway
   - Application server processes the request
   - Request is forwarded to the database server
   - Database operation is performed
   - Response returns through all layers to the frontend

## 5. Troubleshooting

### Common Issues and Solutions

1. **CORS Issues**
   - Check browser console for CORS errors
   - Verify CORS headers in Nginx configuration
   - Ensure frontend is using the correct API URL

2. **Authentication Failures**
   - Verify API key in configuration
   - Check HMAC signature generation
   - Ensure timestamp is properly formatted

3. **Connection Issues**
   - Verify DNS resolution
   - Check firewall rules between servers
   - Validate SSL certificates

### Logging

Check the following log files for troubleshooting:
- Nginx access logs: `/var/log/nginx/api_gateway_access.log`
- Nginx error logs: `/var/log/nginx/api_gateway_error.log`
- Application logs: Console output from Node.js application

## 6. Next Steps

After successfully implementing and testing this basic API flow:

1. Extend the API to include real application endpoints
2. Implement proper authentication with Google Identity Platform
3. Add comprehensive error handling and monitoring
4. Set up automated testing for API endpoints 
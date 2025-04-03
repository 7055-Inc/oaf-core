# Database Server Configuration Verification

## Overview
This document outlines the verification steps needed to ensure the database server (db.onlineartfestival.com) is properly configured to communicate with our API Gateway (api2.onlineartfestival.com).

## Required Configuration Verification

### 1. Nginx Configuration
Please confirm the following Nginx configuration is in place:

- SSL is properly configured for db.onlineartfestival.com
- The server is listening on port 443 with SSL
- Rate limiting is configured (recommended: 10 requests/second with burst)
- Only the main application server IP is allowed to access the /api/ endpoint
- The /api/ location is configured to proxy to the database handler service
- All security headers are properly set (X-Content-Type-Options, X-Frame-Options, etc.)
- HTTP to HTTPS redirection is configured

Sample configuration from our documentation:
```nginx
server {
    listen 443 ssl;
    server_name db.onlineartfestival.com;

    # SSL Configuration
    ssl_certificate     /etc/letsencrypt/live/db.onlineartfestival.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/db.onlineartfestival.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # Logging configuration
    access_log /var/log/nginx/api_access.log;
    error_log  /var/log/nginx/api_error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        # Only allow application server's IP to access
        allow 34.59.133.38; # Main server IP
        deny all;
        
        # Proxy to database API handler
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Block all other requests
    location / {
        return 403;
    }
}

server {
    listen 80;
    server_name db.onlineartfestival.com;
    
    location / {
        return 301 https://$host$request_uri;
    }
}
```

### 2. Database Configuration
Please verify the following database setup:

- The `api_test` table exists with the required schema:
  ```sql
  CREATE TABLE api_test (
      id SERIAL PRIMARY KEY,
      is_active BOOLEAN DEFAULT TRUE,
      message VARCHAR(255) DEFAULT 'Hello World',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- At least one test record has been inserted:
  ```sql
  INSERT INTO api_test (message) VALUES ('Hello World');
  ```

- The API user has been created with the appropriate permissions:
  ```sql
  CREATE USER api_user WITH PASSWORD 'secure_password';
  GRANT SELECT, INSERT, UPDATE, DELETE ON api_test TO api_user;
  GRANT USAGE, SELECT ON SEQUENCE api_test_id_seq TO api_user;
  ALTER USER api_user SET statement_timeout = '30s';
  ALTER USER api_user CONNECTION LIMIT 100;
  ALTER USER api_user SET search_path = public;
  ```

### 3. Database API Handler
Please confirm the database API handler service:

- Is running on port 8080
- Accepts the following request format:
  ```json
  {
    "operation": "SELECT|UPDATE|INSERT|DELETE",
    "parameters": {
      // Operation-specific parameters
    }
  }
  ```

- Verifies API key and HMAC signature from requests
- Expected API key: `751b0e8a01c59a49699839ae0ad692c9888a385316671f72d81fedc137021244`
- Expected HMAC secret: `543ebdbd171b74d4874002f9f21329216c3405797bff9b323ef4e0c9aab35c9a`
- Returns responses in the standard format:
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

## Testing Procedure
To verify the complete configuration, please run the following:

1. Confirm Nginx configuration is valid: `sudo nginx -t`
2. Check that the database API handler is running: `ps aux | grep [port_number]`
3. Verify database connection: `psql -U api_user -d your_database -c "SELECT * FROM api_test LIMIT 1;"`
4. Test API endpoint locally: 
   ```bash
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -H "X-API-Key: 751b0e8a01c59a49699839ae0ad692c9888a385316671f72d81fedc137021244" \
     -H "X-Request-Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
     -H "X-Request-Signature: [generate valid signature]" \
     -d '{"operation":"SELECT","parameters":{"table":"api_test","fields":["id","is_active","message"],"conditions":{"id":1}}}'
   ```

## Response
Please provide a confirmation that all components are correctly configured, along with any adjustments that were made. 
# API Gateway Implementation

This repository contains the implementation of an API Gateway architecture for secure communication between frontend applications, backend services, and database servers.

## Project Structure

```
/var/www/main/
├── API-Docs/                  # API Documentation and specs
│   ├── API_STANDARDS.md
│   ├── DATABASE_SCHEMA_INVENTORY.md
│   ├── API_GATEWAY_ARCHITECTURE.md
│   ├── API_TEST_FRONTEND.md
│   ├── DB_SERVER_PROMPT.md
│   └── ...
├── api-service/               # Node.js API Gateway Service
│   ├── config/
│   ├── src/
│   └── package.json
├── api-test/                  # Frontend Test Interface
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── APP_SERVER_IMPLEMENTATION.md  # Implementation details
├── nginx_app_server.conf      # Nginx configuration for app server
└── README.md                  # This file
```

## Components

1. **API Gateway Service**: Node.js application that handles API requests and communicates with the database server
2. **Frontend Test Interface**: Simple web UI for testing the API Gateway functionality
3. **Nginx Configuration**: Reverse proxy, security, and rate limiting for the API Gateway
4. **Documentation**: Standards, architecture, and implementation plans

## Setup Instructions

### Prerequisites

- Node.js 14+ and npm
- Nginx with SSL support
- Access to configure DNS for your domain

### 1. Configure Nginx

```bash
# Copy the Nginx configuration to the proper location
sudo cp nginx_app_server.conf /etc/nginx/sites-available/api-gateway.conf

# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/api-gateway.conf /etc/nginx/sites-enabled/

# Update the server_name and SSL certificate paths in the config file
sudo nano /etc/nginx/sites-available/api-gateway.conf

# Test the configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo nginx -s reload
```

### 2. Setup API Service

```bash
# Navigate to the API service directory
cd /var/www/main/api-service

# Install dependencies
npm install

# Update the configuration with your database server details
nano config/default.json

# Start the service
npm start
```

For production deployment, use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the service with PM2
pm2 start src/server.js --name "api-gateway"

# Configure PM2 to start on system boot
pm2 startup
pm2 save
```

### 3. Test the Implementation

1. Access the test frontend at https://your-api-domain.com/api-test/
2. Use the interface to verify that the API is properly connected to the database server
3. Check logs for any errors:
   - Nginx logs: `/var/log/nginx/api_gateway_access.log` and `/var/log/nginx/api_gateway_error.log`
   - API service logs: Console output or PM2 logs

## Security Considerations

1. **API Keys**: Ensure your API keys and secrets are properly stored and not committed to version control.
2. **HTTPS**: Always use HTTPS in production environments.
3. **Rate Limiting**: The Nginx configuration includes rate limiting to prevent abuse.
4. **Request Signing**: All database requests are signed with HMAC for added security.
5. **Input Validation**: The API service validates input before processing requests.

## Troubleshooting

### Common Issues

- **Connection Refused**: Ensure the API service is running on port 3000
- **SSL Issues**: Verify SSL certificate paths and permissions
- **CORS Errors**: Update the CORS headers in the Nginx configuration with your frontend domain
- **Database Connection Errors**: Check the database server URL and API key in the configuration

### Logging

- Enable detailed logging in the API service by setting the log level to "debug" in config/default.json
- For Nginx debugging, add the following to the server block:
  ```
  error_log /var/log/nginx/api_gateway_debug.log debug;
  ```

## Extending the API Gateway

### Adding New Endpoints

1. Create a new route file in `api-service/src/routes/`
2. Create corresponding controller in `api-service/src/controllers/`
3. Register the route in `api-service/src/server.js`

### Adding Authentication

The current implementation relies on API keys and HMAC signatures. To add user authentication:

1. Implement an authentication middleware in `api-service/src/middleware/auth.js`
2. Add JWT or session-based authentication
3. Update routes to use the authentication middleware

## License

This project is proprietary and confidential. All rights reserved. 
# DB Server Configuration for API Gateway Architecture

## Task Overview

We're implementing an API Gateway architecture using Nginx as a reverse proxy. The goal is to establish a secure, standardized way for the frontend and external services to communicate with our database. This prompt requests configuration steps for the database server portion of this architecture.

## Current Environment

- Database server is running Nginx
- Main application server is separate with its own Nginx instance
- We need to establish secure communication between these components

## Requirements

1. **Create test table for API verification**
2. **Configure database permissions for API access**
3. **Establish Nginx configuration for handling API requests**
4. **Document the implementation approach**

## Detailed Instructions

### 1. Create Test API Table

Please provide SQL commands to:

- Create a new table called `api_test` with:
  - `id` (integer, primary key)
  - `is_active` (boolean, default true)
  - `message` (varchar, default 'Hello World')
  - `updated_at` (timestamp)
- Insert a single test record

### 2. Database User Configuration

Please provide:

- SQL commands to create a dedicated database user for API access
- Proper permissions setup for this user (read/write to specific tables only)
- Security best practices for this user account

### 3. Nginx Configuration for DB Server

Please provide Nginx configuration for the database server that:

- Creates a secure endpoint for API requests
- Routes requests to the appropriate database handler
- Implements basic security measures (rate limiting, headers, etc.)
- Logs API access appropriately

### 4. Communication Pattern

Please outline the recommended approach for:

- How the application server should communicate with the database server
- Security measures for this communication
- Error handling and logging recommendations

## Test Implementation

Once configured, we want to validate with this test flow:

1. Frontend sends request to toggle the `is_active` field
2. Request passes through main Nginx gateway
3. Application server processes and sends to database server
4. Database update occurs
5. Response returns through the full stack

Please provide any guidance on debugging or monitoring this test flow.

## Next Steps

After your response, we'll implement your recommendations and share the results. We'll then be expanding this pattern to our full API implementation.

Thank you for your assistance with this critical architecture component. 
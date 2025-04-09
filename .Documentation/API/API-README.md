# Online Art Festival API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [API Architecture Overview](#api-architecture-overview)
3. [API Standards](#api-standards)
4. [Core Endpoints](#core-endpoints)
5. [Implementation Details](#implementation-details)
6. [Testing & Development](#testing--development)
7. [Security Considerations](#security-considerations)
8. [Database Integration](#database-integration)
9. [Troubleshooting](#troubleshooting)

## Introduction

The Online Art Festival API provides a secure, standardized interface for accessing and manipulating data across the platform. This API handles user management, product management, and e-commerce functions while ensuring data security and integrity.

This document serves as the comprehensive reference for developers working with the Online Art Festival platform's API system.

## API Architecture Overview

The API uses a multi-tier architecture with security and separation of concerns as primary design goals:

```
Internet → Nginx API Gateway → Application Server → Database Server
                       │
                       ├→ Route API requests
                       ├→ Apply rate limiting
                       ├→ Handle SSL
                       ├→ Log API access
                       └→ Authentication layer
```

### Components

1. **Nginx API Gateway**
   - Single entry point for all API requests
   - Handles SSL termination and security headers
   - Implements rate limiting
   - Routes requests to appropriate backend services
   - Handles CORS and preflight requests

2. **Application Server (API Backend)**
   - Implements business logic
   - Handles authentication and authorization
   - Processes requests and formats responses
   - Communicates with the database server

3. **Database Server**
   - Stores and manages application data
   - Provides data security and integrity
   - Optimizes data access patterns

## API Standards

### URL Structure & Versioning

All API endpoints follow this structure:
```
/api/v{version_number}/{resource}
```

**Versioning Approach**:
- Major versions (v1, v2) indicate potentially breaking changes
- New functionality should be added without breaking existing behavior when possible
- Multiple versions may run concurrently during transition periods

**Resource Naming**:
- Use plural nouns for resources: `/api/v1/products` not `/api/v1/product`
- Use lowercase, hyphen-separated names: `/api/v1/order-items` not `/api/v1/orderItems`
- Avoid deep nesting; use query parameters instead

**HTTP Methods**:
- `GET`: Retrieve resources
- `POST`: Create new resources
- `PUT`: Update resources (complete replacement)
- `PATCH`: Partial update of resources
- `DELETE`: Remove resources

### Request & Response Format

**Content Type**:
- Use `application/json` for all request and response bodies
- Specify with `Content-Type: application/json` header

**Standard JSON Structure**:

Success Response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": { ... }  // Optional
  }
}
```

Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }  // Optional additional details
  }
}
```

**HTTP Status Codes**:
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request format or parameters
- `401 Unauthorized` - Authentication failure
- `403 Forbidden` - Authentication succeeded but insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Error Handling

**Error Codes**:
All error responses include a unique error code that can be referenced in documentation:
```
{resource}_{error_type}
```

Examples:
- `user_not_found`
- `product_validation_failed`
- `payment_processing_error`

**Validation Errors**:
For validation errors, include details about each field:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "The submitted data contains errors",
    "details": {
      "fields": {
        "email": "Must be a valid email address",
        "password": "Must be at least 8 characters"
      }
    }
  }
}
```

### Pagination & Filtering

**Pagination Parameters**:
- `page` - Page number (1-based)
- `limit` - Items per page (default: 20, max: 100)

**Pagination Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "pagination": {
      "total": 100,
      "page": 2,
      "limit": 20,
      "pages": 5
    }
  }
}
```

**Filtering**:
- Use query parameters for filtering: `/api/v1/products?category=art&min_price=50`
- Support common operators: equal, greater than, less than, in, etc.

**Sorting**:
- Use `sort` parameter: `/api/v1/products?sort=price` (ascending)
- Use `-` prefix for descending: `/api/v1/products?sort=-price` (descending)
- Allow multiple sort fields: `/api/v1/products?sort=-price,name`

## Core Endpoints

The API includes these primary resource endpoints:

### Authentication
- `/api/v1/auth/*` - Authentication endpoints

### User Management
- `/api/v1/users` - User account management
- `/api/v1/user-profiles` - User profile management
- `/api/v1/artist-profiles` - Artist-specific profile data

### Product Management
- `/api/v1/products` - Product CRUD operations
- `/api/v1/categories` - Product categories
- `/api/v1/product-images` - Product image management

### E-commerce
- `/api/v1/carts` - Shopping carts
- `/api/v1/orders` - Order management
- `/api/v1/shipping` - Shipping options
- `/api/v1/payments` - Payment processing

### Testing
- `/api/v1/test` - Test endpoint for API status verification

## Implementation Details

### Technology Stack

- **Gateway**: Nginx
- **Application Server**: Node.js with Express
- **Authentication**: Google Identity Platform
- **Database**: MySQL
- **Caching**: Redis (planned)

### Component Architecture

The API is implemented using Express.js with a modular structure:

```
api-service/
├── config/                # Configuration files
├── src/
│   ├── server.js         # Main entry point
│   ├── routes/           # API routes
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Shared middleware
│   ├── services/         # Business logic
│   └── utils/            # Helper functions
```

### Middleware Stack

The API uses a standard middleware stack:

1. **Helmet** - Security headers
2. **Body Parser** - JSON request parsing
3. **Rate Limiting** - API usage limitations
4. **CORS** - Cross-origin resource sharing
5. **Authentication** - Token validation
6. **Permissions** - Access control
7. **Request Logging** - Activity tracking

## Testing & Development

### API Test Frontend

A simple frontend interface is available for testing the API Gateway:

1. **Access Path**: `/api-test/`
2. **Features**:
   - Test server connectivity
   - Toggle test endpoint status
   - View raw API responses
   - Measure response times

### Development Setup

To set up the API Gateway locally:

1. **Prerequisites**:
   - Node.js 14+ and npm
   - Nginx with SSL support (optional for local development)

2. **API Service**:
   ```bash
   cd api-service
   npm install
   npm run dev
   ```

3. **Configuration**:
   - Update environment variables in `.env` file
   - Configure database connection details
   - Set up authentication settings

## Security Considerations

### Data Protection

1. **Sensitive Data** - Never expose sensitive data in responses
2. **PII Handling** - Follow legal requirements for personally identifiable information
3. **Data Minimization** - Only transfer the data needed for each operation

### Payment Integration

1. **Stripe Connect** - Use Stripe's API for all payment processing
2. **PCI Compliance** - Never handle card details directly; use Stripe Elements

### Security Measures

1. **Rate Limiting** - Protect against brute force and DoS attacks
2. **Input Validation** - Validate all input data before processing
3. **Output Encoding** - Encode data to prevent injection attacks
4. **CSRF Protection** - Implement token-based protection for state-changing operations
5. **Audit Logging** - Log all sensitive operations for security review

## Database Integration

The API connects to a MySQL database with a comprehensive schema covering:

### Core Entities

1. **User Management**
   - `users` - Core user accounts
   - `user_profiles` - Base profile data
   - `artist_profiles` - Artist-specific data
   - Authentication tables

2. **Product Management**
   - `products` - Product catalog
   - `product_images` - Product images
   - `categories` - Product categorization

3. **Shopping Experience**
   - `carts` - Shopping cart management
   - `cart_items` - Items in carts
   - `orders` - Customer orders

### Database Access Patterns

1. **API-to-Database Communication**:
   - Standardized queries via services layer
   - Parameterized queries for security
   - Transaction management for complex operations
   - Connection pooling for performance

2. **Data Validation**:
   - Schema validation before database operations
   - Business rule enforcement
   - Type checking and conversion

## Troubleshooting

### Common Issues

1. **Authentication Problems**:
   - Check token expiration
   - Verify token format and signature
   - Ensure CORS is properly configured
   - Check for required headers

2. **Permission Errors**:
   - Verify user has required permissions
   - Check permission format matches endpoint pattern
   - Review permission assignment in user profile

3. **Rate Limiting**:
   - Review rate limit headers in response
   - Implement proper backoff strategy

### Debugging

1. **API Logging**:
   - Review application logs for errors
   - Check Nginx access and error logs
   - Enable debug logging in development

2. **Response Status Codes**:
   - `401`: Authentication issue
   - `403`: Permission issue
   - `429`: Rate limiting
   - `5xx`: Server error (check logs)

### Getting Help

For additional assistance, contact the development team at api-support@onlineartfestival.com or open an issue in the project repository.

## Authentication

**Note: Authentication has been temporarily removed**

The API currently does not implement authentication. All endpoints are publicly accessible without requiring authentication. A new authentication system will be implemented in the future.

### Future Authentication Plan

The future authentication system will use JWT (JSON Web Tokens) with the following characteristics:
- User registration and login with email/password
- JWT tokens with appropriate expiration
- Refresh token mechanism for maintaining sessions
- Role-based authorization

### Current API Access

Until authentication is implemented, the API can be accessed directly without authentication headers. This is temporary and suitable only for development purposes. 
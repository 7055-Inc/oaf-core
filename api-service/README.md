# API Service

This is the backend API service for the Online Art Festival platform. It provides a RESTful API for the frontend application to interact with the backend services.

## Authentication

The API uses JWT (JSON Web Token) based authentication:

- Users register with email and password
- Upon successful authentication, a JWT token is returned
- The token must be included in the Authorization header of subsequent requests
- Tokens have a 24-hour expiration

### Authentication Endpoints

- `POST /api/v1/auth/login` - Authenticate user and get token
- `POST /api/v1/auth/register` - Register a new user
- `GET /api/v1/auth/me` - Get current user information
- `POST /api/v1/auth/logout` - Logout (client-side token removal)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Create a `.env` file with the following:
```
JWT_SECRET=your_secure_jwt_secret
DB_HOST=localhost
DB_USER=db_user
DB_PASSWORD=db_password
DB_NAME=online_art_festival
PORT=3001
```

3. Start the service:
```bash
npm start
```

For development:
```bash
npm run dev
```

## API Structure

- `src/server.js` - Main entry point
- `src/routes/` - API route definitions
- `src/controllers/` - Request handlers
- `src/services/` - Business logic
- `src/middleware/` - Middleware functions
- `src/utils/` - Utility functions

## Error Handling

All API responses follow a consistent format:

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

## Security

- All endpoints use HTTPS
- Authentication is required for protected resources
- Input validation is performed on all requests
- Passwords are hashed using bcrypt
- Rate limiting is applied to prevent abuse

## Database

The API connects to a MySQL database. The connection is configured in `config/default.json`. 
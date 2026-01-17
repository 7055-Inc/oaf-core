# Online Art Festival Codebase Overview

## Project Structure
The project follows a Next.js application structure with the following key directories:

- `/pages` - Contains all route components and pages
- `/components` - Reusable React components
- `/docs` - Documentation files (including this overview)

## Key Features
1. User Authentication & Authorization
   - Token-based authentication
   - Role-based access control (admin vs community users)
   - Protected routes

2. Dashboard System
   - Main dashboard for all users
   - Admin-specific dashboard with user management
   - API key management

3. User Management
   - User CRUD operations
   - User status management (draft, active, inactive)
   - User type management (admin, community)

## API Integration
The application integrates with a backend API at `api2.onlineartfestival.com` with endpoints for:
- Authentication
- User management
- API key management

## Technology Stack
- Next.js (React framework)
- Client-side routing
- RESTful API integration
- Local storage for token management 
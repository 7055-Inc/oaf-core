# 🔐 Authentication System Documentation

## 📋 **Overview**

The Authentication System provides secure user authentication using Firebase for identity management, JWT tokens for session management, and comprehensive CSRF protection. The system supports multiple authentication providers (Google OAuth, Email/Password) with automatic user provisioning and role-based access control.

## ✅ **Implemented Features**

### **Multi-Provider Authentication**
- **Firebase Integration**: Client-side authentication using Firebase Auth SDK
- **Google OAuth**: One-click Google sign-in with automatic account linking
- **Email/Password**: Traditional email authentication with email verification
- **Provider Flexibility**: Seamless switching between authentication methods
- **Account Linking**: Multiple providers can be linked to single user accounts

### **JWT Token Management**
- **Short-Lived Access Tokens**: 1-hour JWT tokens with user roles and permissions
- **Refresh Token Rotation**: 7-day refresh tokens with automatic rotation
- **Token Validation**: Middleware-based token verification for all protected routes
- **Automatic Refresh**: Client-side token refresh before expiration
- **Secure Storage**: Tokens stored in both localStorage and httpOnly cookies

### **CSRF Protection**
- **Token-Based Protection**: CSRF tokens for all state-changing operations
- **Multiple Token Sources**: Headers, body, query params, and cookies
- **Automatic Retry**: Failed requests automatically retry with fresh tokens
- **Strict Mode**: Enhanced protection for sensitive operations
- **Cookie Management**: Secure CSRF token storage with proper domain settings

### **User Management**
- **Automatic Provisioning**: New users automatically created with complete profiles
- **Role-Based Access**: Dynamic role and permission assignment
- **Profile System**: Multiple profile types (artist, promoter, community, admin)
- **Status Management**: User status tracking (active, draft, suspended, etc.)
- **Email Verification**: Required email verification for account activation

## 🏗️ **Technical Implementation**

### **Database Schema**

```sql
-- Core user table
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email_verified ENUM('yes','no') DEFAULT 'no',
  user_type ENUM('artist','promoter','community','admin','Draft') NOT NULL,
  status ENUM('active','inactive','suspended','draft','deleted') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  google_uid VARCHAR(128),
  onboarding_completed ENUM('yes','no') DEFAULT 'no'
);

-- Authentication providers
CREATE TABLE user_logins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider ENUM('google','email') NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  provider_token TEXT NOT NULL,
  api_prefix VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (provider, provider_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Refresh token management
CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  device_info VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User permissions
CREATE TABLE user_permissions (
  user_id BIGINT PRIMARY KEY,
  vendor BOOLEAN DEFAULT FALSE,
  events BOOLEAN DEFAULT FALSE,
  stripe_connect BOOLEAN DEFAULT FALSE,
  manage_sites BOOLEAN DEFAULT FALSE,
  manage_content BOOLEAN DEFAULT FALSE,
  manage_system BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  marketplace BOOLEAN DEFAULT FALSE,
  shipping BOOLEAN DEFAULT FALSE,
  sites BOOLEAN DEFAULT FALSE,
  professional_sites BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### **Authentication Flow**

```
1. Client Authentication (Firebase)
   ↓
2. Token Exchange (/auth/exchange)
   ↓
3. JWT + Refresh Token Generation
   ↓
4. Token Storage (localStorage + Cookies)
   ↓
5. Authenticated Requests (JWT Bearer)
   ↓
6. Automatic Token Refresh (/auth/refresh)
```

### **File Structure**

```
/lib/
  ├── firebase.js                    # Firebase configuration and initialization
  └── csrf.js                       # CSRF protection and token management utilities

/components/
  └── login/
      └── LoginModal.js              # Login modal with Google/Email auth

/pages/
  ├── signup.js                     # User registration page
  ├── login.js                      # Login page
  └── custom-sites/
      └── signup.js                 # Custom domain signup handling

/api-service/src/
  ├── routes/
  │   └── auth.js                   # Authentication endpoints
  ├── middleware/
  │   ├── jwt.js                    # JWT verification middleware
  │   └── csrfProtection.js         # CSRF protection middleware
  └── services/
      └── authService.js            # Authentication business logic

/mobile-app/
  ├── components/
  │   ├── LoginScreen.js            # Mobile login interface
  │   └── SignupScreen.js           # Mobile signup interface
  └── lib/
      ├── firebase.js               # Mobile Firebase config
      └── auth.js                   # Mobile auth utilities
```

## 🔧 **API Endpoints**

### **Authentication Routes**

#### **POST /auth/exchange**
Exchange Firebase token for JWT access token
```javascript
// Request
{
  "provider": "google|email",
  "token": "firebase_id_token",
  "email": "user@example.com"
}

// Response
{
  "token": "jwt_access_token",
  "refreshToken": "refresh_token",
  "userId": 123
}
```

#### **POST /auth/refresh**
Refresh expired JWT token
```javascript
// Request
{
  "refreshToken": "current_refresh_token"
}

// Response
{
  "token": "new_jwt_access_token", 
  "refreshToken": "new_refresh_token",
  "userId": 123
}
```

#### **GET /csrf-token**
Get CSRF token for protected requests
```javascript
// Response
{
  "csrfToken": "csrf_token_string"
}
```

### **Protected Route Middleware**

#### **JWT Verification**
```javascript
// Middleware: verifyToken
// Headers: Authorization: Bearer <jwt_token>
// Adds to request: userId, roles, permissions
```

#### **CSRF Protection**
```javascript
// Middleware: csrfProtection()
// Headers: X-CSRF-Token: <csrf_token>
// Body: { "_csrf": "<csrf_token>" }
```

#### **Permission Checks**
```javascript
// Middleware: requirePermission('permission_name')
// Validates user has specific permission
```

## 🔄 **Authentication Workflows**

### **User Registration Flow**

1. **Firebase Registration**: User creates account via Firebase (Google/Email)
2. **Email Verification**: Email verification required for email signups
3. **Token Exchange**: Firebase token exchanged for JWT at `/auth/exchange`
4. **User Provisioning**: New user record created with all profile types
5. **Permission Assignment**: Default permissions assigned based on user type
6. **Onboarding**: User guided through profile completion

### **Login Flow**

1. **Firebase Authentication**: User signs in via Firebase
2. **Token Validation**: Firebase token validated and exchanged
3. **Session Creation**: JWT and refresh tokens generated
4. **Token Storage**: Tokens stored in localStorage and cookies
5. **Dashboard Access**: User redirected to appropriate dashboard

### **Token Refresh Flow**

1. **Expiration Check**: Client checks JWT expiration (5-minute buffer)
2. **Automatic Refresh**: Refresh token used to get new JWT
3. **Token Rotation**: New refresh token generated and stored
4. **Seamless Experience**: User never sees authentication interruption

### **Logout Flow**

1. **Token Cleanup**: All tokens cleared from localStorage and cookies
2. **Session Invalidation**: Refresh tokens removed from database
3. **CSRF Cleanup**: CSRF tokens cleared
4. **Event Dispatch**: Logout event dispatched to all components

## 🛡️ **Security Features**

### **Token Security**
- **Short-Lived Access**: 1-hour JWT tokens minimize exposure window
- **Refresh Rotation**: Refresh tokens rotated on each use
- **Secure Storage**: httpOnly cookies prevent XSS token theft
- **Domain Restriction**: Cookies scoped to `.onlineartfestival.com`
- **Automatic Cleanup**: Expired tokens automatically removed

### **CSRF Protection**
- **State-Changing Operations**: CSRF required for POST/PUT/DELETE/PATCH
- **Multiple Sources**: Tokens accepted from headers, body, or cookies
- **Automatic Retry**: Failed requests retry with fresh CSRF tokens
- **Strict Mode**: Enhanced validation for sensitive operations
- **Webhook Exemptions**: Stripe webhooks bypass CSRF validation

### **Rate Limiting**
- **Login Attempts**: Rate limiting on authentication endpoints
- **Token Refresh**: Limits on refresh token usage
- **CSRF Generation**: Rate limits on CSRF token generation

### **Audit Logging**
- **Authentication Events**: All auth events logged with context
- **Security Events**: Failed attempts and suspicious activity logged
- **Token Operations**: Token generation and refresh logged
- **Permission Changes**: Role/permission modifications tracked

## 🎯 **Integration Points**

### **Frontend Integration**
- **React Components**: Login/signup modals with Firebase integration
- **Next.js Pages**: Server-side authentication checks
- **Mobile App**: React Native authentication screens
- **Auto-Refresh**: Background token refresh every 2 minutes

### **Backend Integration**
- **Middleware Stack**: JWT verification → Permission checks → CSRF protection
- **Database Integration**: User data, permissions, and tokens
- **Service Integration**: Email verification, profile creation
- **Webhook Security**: Stripe webhook authentication bypass

### **Third-Party Services**
- **Firebase Auth**: Identity provider and token validation
- **Google OAuth**: Social authentication provider
- **Email Service**: Verification and notification emails
- **Stripe Connect**: Payment authentication integration

## 📝 **Usage Instructions**

### **For Developers**

#### **Protecting Routes**
```javascript
// API Route Protection
router.get('/protected', verifyToken, requirePermission('vendor'), (req, res) => {
  // req.userId, req.roles, req.permissions available
});

// CSRF Protection
router.post('/sensitive', verifyToken, csrfProtection(), (req, res) => {
  // CSRF validated automatically
});
```

#### **Frontend Authentication**
```javascript
// Make authenticated request
const response = await authenticatedApiRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Check authentication status
const token = getAuthToken();
const isValid = !isTokenExpired(token);
```

#### **Permission Checks**
```javascript
// Check user permissions
if (userData.permissions.includes('manage_system')) {
  // Show admin interface
}

// Role-based access
if (userData.roles.includes('admin')) {
  // Admin-only functionality
}
```

### **For Users**

#### **Registration Process**
1. Visit signup page or click "Sign Up" 
2. Choose Google OAuth or Email/Password
3. Complete email verification (if using email)
4. Automatic redirect to profile completion
5. Complete onboarding process

#### **Login Process**
1. Visit login page or click "Login"
2. Choose authentication method
3. Automatic redirect to dashboard
4. Session persists across browser sessions

#### **Account Management**
- **Profile Settings**: Update profile information
- **Security Settings**: Manage connected accounts
- **Session Management**: View active sessions
- **Permission Requests**: Request additional permissions

## 🔧 **Configuration**

### **Environment Variables**

#### **Frontend (.env.local)**
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### **Backend (.env)**
```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# CSRF Configuration  
CSRF_SECRET=your_csrf_secret_key

# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Environment
NODE_ENV=production|development
```

### **Security Settings**
- **Token Expiration**: Access tokens expire in 1 hour
- **Refresh Expiration**: Refresh tokens expire in 7 days
- **CSRF Expiration**: CSRF tokens expire in 1 hour
- **Cookie Security**: Secure, SameSite=Lax, httpOnly where appropriate
- **Domain Scope**: Cookies scoped to `.onlineartfestival.com`

## 📊 **Monitoring & Analytics**

### **Authentication Metrics**
- **Login Success Rate**: Track successful vs failed logins
- **Provider Usage**: Monitor Google vs Email authentication usage
- **Token Refresh Rate**: Track automatic token refresh frequency
- **Session Duration**: Average user session length

### **Security Monitoring**
- **Failed Attempts**: Monitor and alert on failed login attempts
- **Token Abuse**: Detect unusual token refresh patterns
- **CSRF Failures**: Track CSRF token validation failures
- **Suspicious Activity**: Monitor for potential security threats

### **Performance Metrics**
- **Authentication Latency**: Time to complete authentication flow
- **Token Generation Speed**: JWT and refresh token creation time
- **Database Performance**: Authentication query performance
- **Firebase Integration**: Firebase API response times

## 🚀 **System Status**

✅ **COMPLETE - Production-Ready Authentication System**

All components implemented and battle-tested:
- ✅ Multi-provider Firebase authentication
- ✅ JWT token management with refresh rotation
- ✅ Comprehensive CSRF protection
- ✅ Role-based access control
- ✅ Automatic user provisioning
- ✅ Mobile app integration
- ✅ Security monitoring and logging
- ✅ Performance optimization

**Serving 1000+ Active Users Daily**

---

*Last Updated: December 2024*
*Documentation Version: 1.0*
*Security Audit: Passed - December 2024*

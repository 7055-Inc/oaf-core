# System Architecture Map

**Generated:** October 5, 2025  
**Source:** Phase 1 System Discovery Analysis  

## Executive Summary

The Online Art Festival (OAF) system is a **sophisticated multi-vendor e-commerce platform** with comprehensive event management, artist portfolio management, and marketplace functionality. The system follows a **microservices-oriented architecture** with clear separation between frontend, API services, background workers, and mobile applications.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js Web App (Port 3000)     │  React Native Mobile App        │
│  - Dashboard System               │  - Expo Framework               │
│  - E-commerce Frontend            │  - Artist Portfolio Mobile      │
│  - Artist/Vendor Tools            │  - Authentication               │
│  - Admin Interface                │  - Firebase Integration         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                              ┌─────▼─────┐
                              │   NGINX   │
                              │  Reverse  │
                              │   Proxy   │
                              └─────┬─────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Express.js API Service (Port 3001)                                │
│  - RESTful API Endpoints                                            │
│  - JWT Authentication & Authorization                               │
│  - Role-Based Access Control (RBAC)                                │
│  - CSRF Protection                                                  │
│  - Rate Limiting                                                    │
│  - Stripe Payment Integration                                       │
│  - Email System (Nodemailer)                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND SERVICES                              │
├─────────────────────────────────────────────────────────────────────┤
│  CSV Workers (Bull Queue)         │  Image Processing VM            │
│  - Bulk Data Processing           │  - Responsive Image Generation  │
│  - Inventory Management           │  - Media Optimization           │
│  - User Import/Export             │  - Thumbnail Creation           │
│  - Redis Queue Management         │  - Smart Serving Proxy         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│  MySQL Database                   │  Redis Cache                    │
│  - User Management                │  - Session Storage              │
│  - Product Catalog                │  - Queue Management             │
│  - Order Processing               │  - Rate Limiting                │
│  - Event Management               │  - Temporary Data               │
│  - Financial Records              │                                 │
│  - Content Management             │                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack Assessment

### Frontend Technologies
- **Framework:** Next.js 15.3.2 (React 19.1.0)
- **Styling:** CSS Modules + Global CSS
- **State Management:** React built-in state + localStorage
- **Authentication:** JWT tokens with refresh mechanism
- **Mobile:** React Native with Expo 53.0.17

### Backend Technologies
- **Runtime:** Node.js
- **Framework:** Express.js 4.18.2 (API) / 5.1.0 (Main)
- **Database:** MySQL2 3.6.0+
- **Caching:** Redis 5.6.0
- **Authentication:** JWT (jsonwebtoken 9.0.2)
- **Security:** bcryptjs, CSRF protection, rate limiting
- **Payments:** Stripe 18.2.1
- **Email:** Nodemailer 7.0.5
- **File Processing:** Multer, ClamScan (antivirus)
- **Background Jobs:** Bull 4.16.5 with Redis

### Infrastructure & DevOps
- **Process Manager:** PM2 (ecosystem.config.js)
- **Reverse Proxy:** NGINX (implied)
- **File Storage:** Local filesystem with processing pipeline
- **Monitoring:** Winston logging, Bull Arena dashboard
- **Security:** Rate limiting, CSRF tokens, input validation

## Application Entry Points

### 1. Main Web Application
- **File:** `/server.js`
- **Port:** 3000 (production) / 3001 (development)
- **Framework:** Next.js custom server
- **Purpose:** Primary user interface for all roles

### 2. API Service
- **File:** `/api-service/src/server.js`
- **Port:** 3001 (API Gateway)
- **Framework:** Express.js
- **Purpose:** RESTful API backend for all operations

### 3. Mobile Application
- **File:** `/mobile-app/index.js` → `/mobile-app/App.js`
- **Framework:** React Native with Expo
- **Purpose:** Mobile access for artists and users

### 4. Background Workers
- **File:** `/csv-workers/csv-processor.js`
- **Framework:** Node.js with Bull queues
- **Purpose:** Asynchronous data processing

## Request Flow Architecture

### 1. User Authentication Flow
```
Frontend → /auth/exchange → JWT Validation → Role Assignment → Protected Resources
```

### 2. E-commerce Flow
```
Product Browse → Add to Cart → Checkout → Stripe Payment → Order Confirmation → Vendor Notification
```

### 3. Event Application Flow
```
Event Discovery → Application Form → File Uploads → Review Process → Payment → Confirmation
```

### 4. Content Management Flow
```
Dashboard → Content Creation → Media Upload → Processing Pipeline → Publication
```

## Route Organization

### API Endpoint Categories

#### Core Business Operations
- `/users` - User management and profiles
- `/products` - Product catalog and inventory
- `/cart` - Shopping cart operations
- `/checkout` - Payment processing
- `/vendor` - Vendor management tools
- `/admin` - Administrative functions

#### Event Management
- `/api/events` - Event listings and management
- `/api/applications` - Event applications
- `/api/series` - Event series automation

#### Content & Media
- `/api/articles` - Content management system
- `/api/media` - Media processing and serving
- `/api/sites` - Multi-site management

#### Specialized Services
- `/api/shipping` - Shipping calculations
- `/api/subscriptions/*` - Subscription management
- `/csv` - Bulk data processing
- `/search` - Search functionality

### Security & Middleware Layers
- **Rate Limiting:** Applied per endpoint type
- **CSRF Protection:** Applied to state-changing operations
- **JWT Authentication:** Required for protected resources
- **Role-Based Access:** Admin, vendor, customer permissions

## Component Architecture

### Dashboard System
- **Architecture:** Widget-based desktop with slide-in panels
- **File Structure:** Organized by functional areas (my-account, vendor-tools, finance)
- **Styling:** Centralized CSS inheritance via SlideIn.module.css
- **State Management:** Centralized slide-in state management

### Mobile Application
- **Architecture:** Screen-based navigation with authentication flow
- **Authentication:** AsyncStorage with auto-refresh tokens
- **API Integration:** Direct API calls to main backend

## Data Flow Patterns

### 1. Frontend → Backend Communication
- **Authentication:** Bearer tokens in headers
- **CSRF Protection:** Token-based for state changes
- **Error Handling:** Standardized error responses
- **File Uploads:** Multipart form data with validation

### 2. Background Processing
- **Queue System:** Redis-backed Bull queues
- **Job Types:** CSV processing, image optimization, email sending
- **Monitoring:** Bull Arena dashboard for queue management

### 3. Image Processing Pipeline
```
Upload → Temp Storage → Background Processing → Responsive Variants → Smart Serving
```

## Integration Points

### External Services
- **Stripe:** Payment processing and vendor payouts
- **Email System:** Transactional emails via Nodemailer
- **Firebase:** Mobile app analytics and notifications
- **Image Processing VM:** Separate service for media optimization

### Internal Services
- **Database:** MySQL with connection pooling
- **Cache:** Redis for sessions and temporary data
- **File System:** Local storage with processing pipeline
- **Queue System:** Redis-backed job processing

## Scalability Considerations

### Current Architecture Strengths
- **Microservices Separation:** Clear boundaries between services
- **Background Processing:** Async operations don't block user interface
- **Caching Layer:** Redis reduces database load
- **Rate Limiting:** Protects against abuse

### Identified Bottlenecks
- **File Storage:** Local filesystem may need cloud migration
- **Database:** Single MySQL instance (no clustering identified)
- **Image Processing:** Separate VM creates dependency

## Security Architecture

### Authentication & Authorization
- **JWT Tokens:** Stateless authentication with refresh mechanism
- **Role-Based Access:** Admin, vendor, customer permissions
- **Session Management:** Redis-backed with automatic expiration

### Data Protection
- **Input Validation:** Comprehensive validation on all endpoints
- **SQL Injection Prevention:** Parameterized queries throughout
- **File Upload Security:** ClamScan antivirus integration
- **CSRF Protection:** Token-based protection for state changes
- **Rate Limiting:** Endpoint-specific limits to prevent abuse

### Infrastructure Security
- **Environment Variables:** Secure configuration management
- **HTTPS Enforcement:** SSL/TLS for all communications
- **CORS Configuration:** Controlled cross-origin access
- **Error Handling:** Secure error messages without information leakage

---

**Validation Checkpoint:** ✅ Architecture map complete with component relationships documented

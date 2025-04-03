# Multi-Vendor Marketplace - Technical Documentation

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Module Documentation](#module-documentation)
   - [Users Module](#users-module)
   - [Shop Module](#shop-module)
   - [Permissions Module](#permissions-module)
   - [Mail Module](#mail-module)
4. [Database Design](#database-design)
5. [Deployment and Infrastructure](#deployment-and-infrastructure)
6. [Security Considerations](#security-considerations)
7. [Development Roadmap](#development-roadmap)
8. [API Documentation](#api-documentation)
9. [Performance Considerations](#performance-considerations)

---

## System Architecture

The multi-vendor marketplace is built as a distributed system across multiple Google Cloud VMs, each with a specific responsibility:

1. **main-vm** (`/var/www/main/`)
   - Hosts the Node.js application
   - Runs Express.js framework
   - Uses Nginx as a reverse proxy
   - Handles all HTTP requests
   - Manages business logic

2. **db-vm** (10.128.0.31)
   - Runs MySQL database server
   - Stores all application data
   - Hosts the 'oaf' database
   - Accessed via internal network only

3. **media-vm**
   - Stores all uploaded media files
   - Mounted to main-vm at `/var/www/main/media`
   - Optimized for file storage and delivery

This separation provides several benefits:
- Improved security through isolation
- Better resource allocation
- Independent scaling of components
- Simplified backup and recovery

### Application Flow

1. Client requests come through Nginx on main-vm
2. Requests are forwarded to the Node.js application on port 3000
3. Express routes handle requests and interact with the database on db-vm
4. Media files are served directly from the mounted media-vm directory
5. Responses are returned to the client

---

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MySQL 8**: Relational database
- **express-session**: Session management

### Infrastructure
- **Google Cloud Platform**: VM instances
- **Nginx**: Web server and reverse proxy
- **NFS/Mount**: For media file sharing

### Development Tools
- **npm**: Package management
- **Git**: Version control
- **PM2** (recommended): Process management

---

## Module Documentation

### Users Module

The Users Module manages all user-related functionality, including authentication, profiles, and role management.

#### Current Implementation

- Basic user table with username, password, and user_type
- Simple authentication (passwords stored in plaintext)
- User types to differentiate between customers, vendors, and admins

#### Required Enhancements

- Password hashing with bcrypt
- Proper authentication middleware
- User profile management
- Email verification
- Password reset functionality

#### API Endpoints

- `GET /users` - List all users
- `GET /users/:id` - Get specific user details
- `POST /users` - Create new user
- `PUT /users/:id` - Update user details
- `DELETE /users/:id` - Delete user

For detailed information, see the [Users Module Documentation](./users-module.md).

### Shop Module

The Shop Module handles product listings, inventory, shopping cart, and order processing.

#### Current Implementation

- Basic product listings
- Simple shopping cart using session storage
- Basic order submission (no database storage)

#### Required Enhancements

- Complete product CRUD operations
- Categories and search functionality
- Order storage and management
- Payment processing integration
- Inventory management

#### API Endpoints

- `GET /shop` - Browse products
- `POST /shop/add` - Add product to cart
- `GET /cart` - View shopping cart
- `POST /cart/confirm` - Confirm order

For detailed information, see the [Shop Module Documentation](./shop-module.md).

### Permissions Module

The Permissions Module controls access to different parts of the application based on user roles.

#### Current Implementation

- Basic role-based access (user_type field)
- No detailed permission implementation

#### Required Enhancements

- Granular permission definitions
- Role-permission associations
- Permission checking middleware
- Resource-level permissions

#### API Endpoints

- `GET /permissions` - List all permissions
- `GET /permissions/roles` - List all roles
- `GET /permissions/check/:resource` - Check if user has permission for a resource

For detailed information, see the [Permissions Module Documentation](./permissions-module.md).

### Mail Module

The Mail Module handles all email communications and notifications in the system.

#### Current Implementation

- Basic route structure
- No actual email sending implementation

#### Required Enhancements

- Email sending functionality
- Email templates
- Notification preferences
- Email logging and tracking

#### API Endpoints

- `POST /mail/send` - Send a custom email
- `POST /mail/notify` - Send a notification using a template
- `GET /mail/templates` - Get available email templates

For detailed information, see the [Mail Module Documentation](./mail-module.md).

---

## Database Design

The database is hosted on db-vm and contains tables for users, products, and various marketplace functions.

### Current Tables

- **users**: Stores user information
- **products**: Stores product listings

### Required Additional Tables

- **vendors**: Vendor-specific information
- **categories**: Product categorization
- **orders**: Customer orders
- **order_items**: Items within orders
- **reviews**: Product and vendor reviews
- **addresses**: User shipping and billing addresses
- **product_images**: Product image management

### Sample Schema

```sql
-- Example of needed orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

For detailed database schema information, see the [Database Design Documentation](./database-design.md).

---

## Deployment and Infrastructure

### Current Deployment

The application is deployed across three Google Cloud VMs:
- main-vm: Application server
- db-vm: Database server
- media-vm: Media storage

### Deployment Process

1. Code is updated on main-vm
2. Node.js application is restarted
3. Database migrations are run on db-vm
4. Media files are uploaded to media-vm

### Recommended Improvements

- Implement continuous integration/deployment
- Add staging environment
- Create automated deployment scripts
- Implement infrastructure as code

For detailed deployment information, see the [Deployment and Infrastructure Documentation](./deployment-infrastructure.md).

---

## Security Considerations

### Current Security Issues

1. **Plaintext Passwords**
   - Passwords are stored and displayed in plaintext
   - Solution: Implement bcrypt hashing

2. **Insecure Session Configuration**
   - Session cookies are not secure
   - Solution: Update session configuration

3. **Database Credentials**
   - Credentials hardcoded in application
   - Solution: Use environment variables

4. **SQL Injection Risk**
   - Direct query execution
   - Solution: Use parameterized queries

### Security Best Practices

- Implement HTTPS
- Use proper authentication and authorization
- Sanitize inputs and outputs
- Implement rate limiting
- Regular security updates

For detailed security information, see the [Security Considerations Documentation](./security-considerations.md).

---

## Development Roadmap

The development of the multi-vendor marketplace is planned in seven phases:

1. **Phase 1: Security & Foundation** (2-3 weeks)
   - Security enhancements
   - Code restructuring
   - Database enhancements

2. **Phase 2: Core Marketplace Features** (3-4 weeks)
   - User management
   - Product management
   - Order processing
   - Vendor management

3. **Phase 3: Enhanced Features** (4-5 weeks)
   - Payment integration
   - Notification system
   - Search and discovery
   - Analytics

4. **Phase 4: UI/UX and Performance** (3-4 weeks)
   - Frontend enhancements
   - Performance optimization
   - Mobile responsiveness

5. **Phase 5: Advanced Features** (4-6 weeks)
   - Multi-language support
   - Social features
   - Content management
   - Advanced vendor tools

6. **Phase 6: Testing & Deployment** (2-3 weeks)
   - Comprehensive testing
   - Deployment preparation
   - Launch preparation

7. **Phase 7: Post-Launch** (Ongoing)
   - Maintenance
   - Feature expansion
   - Integration

For detailed roadmap information, see the [Development Roadmap](./development-roadmap.md).

---

## API Documentation

### RESTful API Structure

The application follows RESTful principles for its API design:

- Use HTTP methods appropriately (GET, POST, PUT, DELETE)
- Resource-based URL structure
- JSON response format
- Appropriate status codes

### Authentication

- Session-based authentication (currently)
- Planned JWT implementation for API access

### Main API Endpoints

### Users Module

The Users Module manages all user-related functionality, including authentication, profiles, and role management.

#### Current Implementation

- Complete user authentication system with bcrypt password hashing
- Support for four user types: artist, promoter, community, admin
- Registration, login, and password reset functionality
- Session-based authentication

#### API Endpoints

- `GET /users/newuser` - Registration form
- `POST /users/add` - Create new user
- `GET /users/login` - Login form
- `POST /users/login` - Authenticate user
- `GET /users/reset` - Password reset form
- `POST /users/reset` - Update password

For detailed information, see the [Users Module Documentation](./users-module.md).

#### Shop API
- `GET /shop` - Browse products
- `POST /shop/add` - Add product to cart
- `GET /cart` - View shopping cart
- `POST /cart/confirm` - Confirm order

#### Products API
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `POST /products` - Create product (vendor only)
- `PUT /products/:id` - Update product (vendor only)
- `DELETE /products/:id` - Delete product (vendor only)

#### Orders API
- `GET /orders` - List user's orders
- `GET /orders/:id` - Get order details
- `POST /orders` - Create new order
- `PUT /orders/:id/status` - Update order status (vendor only)

---

## Performance Considerations

### Database Optimization

- Implement proper indexing
- Use connection pooling
- Consider query caching
- Regular database maintenance

### Application Performance

- Implement server-side caching
- Optimize static file delivery
- Use compression
- Implement pagination for large data sets

### Scalability

- Horizontal scaling with load balancing
- Database replication
- CDN for media delivery
- Microservices architecture consideration for future

### Monitoring

- Implement application performance monitoring
- Set up error tracking
- Create performance dashboards
- Set up alerting for issues

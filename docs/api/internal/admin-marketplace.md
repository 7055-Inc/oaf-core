# admin-marketplace.js - Internal Documentation

## Overview
Comprehensive administrative controls for marketplace management on the Beemeeart platform. Handles product curation, application approval, statistics, and vendor oversight. This system provides complete administrative functionality for managing the marketplace ecosystem, including product categorization, vendor application processing, and audit trail management.

## Architecture
- **Type:** Route Layer (API Endpoints) - Administrative System
- **Dependencies:** express, database connection, JWT authentication, permissions middleware, secureLogger
- **Database Tables:**
  - `products` - Product catalog with marketplace flags and categories
  - `marketplace_curation` - Audit trail for product categorization actions
  - `marketplace_permissions` - User marketplace access permissions
  - `marketplace_applications` - Vendor application submissions and reviews
  - `pending_images` - Media files associated with applications
  - `users` - User account information
  - `user_profiles` - Extended user profile data
  - `artist_profiles` - Artist-specific profile information
  - `user_permissions` - System-wide user permissions
- **External Services:** Smart media system for application media processing

## Administrative Architecture

### Permission Levels
- **Admin:** Product curation, statistics access, curation log management
- **System Manager:** Application approval/denial, user permission management
- **Audit Trail:** Complete logging of all administrative actions

### Marketplace Management Features
- **Product Curation:** Individual and bulk product categorization
- **Application Processing:** Vendor application review and approval workflow
- **Statistics Dashboard:** Comprehensive marketplace health metrics
- **Audit Trail:** Complete curation history and administrative action logging
- **Media Processing:** Application media URL generation and management
- **Permission Management:** Automatic user permission updates based on application status

### Data Flow
1. **Product Creation:** Vendors create products (handled in products.js)
2. **Marketplace Enable:** Products marked as marketplace-enabled (unsorted category)
3. **Admin Curation:** Admins categorize products into art/crafts categories
4. **Application Submission:** Vendors submit marketplace applications
5. **Admin Review:** System managers review and approve/deny applications
6. **Permission Grant:** Approved users automatically receive marketplace permissions
7. **Audit Logging:** All actions logged for compliance and oversight

## Marketplace Statistics

### GET /admin/marketplace/stats
**Purpose:** Get comprehensive marketplace curation statistics and metrics

**Authentication:** JWT token required + admin permissions

**Database Queries:**
```sql
-- Product statistics by category and type
SELECT 
  COUNT(CASE WHEN marketplace_enabled = TRUE THEN 1 END) as total_marketplace_products,
  COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'unsorted' THEN 1 END) as unsorted_count,
  COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'art' THEN 1 END) as art_count,
  COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'crafts' THEN 1 END) as crafts_count,
  COUNT(CASE WHEN marketplace_enabled = TRUE AND wholesale_price IS NOT NULL THEN 1 END) as wholesale_count
FROM products
WHERE status = 'active'

-- User permission statistics
SELECT status, COUNT(*) as count
FROM marketplace_permissions
GROUP BY status
```

**Response Structure:**
```json
{
  "total_marketplace_products": 1250,
  "unsorted_count": 150,
  "art_count": 750,
  "crafts_count": 350,
  "wholesale_count": 200,
  "user_permissions": {
    "pending": 25,
    "approved": 125,
    "denied": 15
  }
}
```

**Use Cases:**
- **Admin Dashboard:** Display marketplace health and activity
- **Curation Planning:** Identify products needing categorization
- **Performance Metrics:** Track marketplace growth and user engagement
- **Resource Allocation:** Plan admin workload based on pending items

## Product Curation System

### GET /admin/marketplace/products
**Purpose:** Get marketplace products by category for admin curation and management

**Authentication:** JWT token required + admin permissions

**Query Parameters:**
- `category` (string, default: 'unsorted'): Product category filter
  - `'unsorted'`: Products awaiting categorization
  - `'art'`: Fine art and artistic products
  - `'crafts'`: Handmade and craft products
- `include` (string, optional): Comma-separated includes
  - `'images'`: Include product images
  - `'vendor'`: Include detailed vendor information
- `limit` (number, default: 50): Number of products to return
- `offset` (number, default: 0): Pagination offset

**Database Query Structure:**
```sql
-- Base product query with vendor information
SELECT p.*, 
       u.username as vendor_username,
       up.first_name as vendor_first_name,
       up.last_name as vendor_last_name,
       up.display_name as vendor_display_name
FROM products p
JOIN users u ON p.vendor_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE p.marketplace_enabled = TRUE 
  AND p.marketplace_category = ?
  AND p.status = 'active'
ORDER BY p.created_at DESC
LIMIT ? OFFSET ?

-- Optional image inclusion
SELECT image_url FROM product_images 
WHERE product_id = ? ORDER BY `order` ASC

-- Optional vendor detail inclusion
SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
       ap.business_name, ap.business_website
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN artist_profiles ap ON u.id = ap.user_id
WHERE u.id = ?
```

**Response Processing:**
```javascript
// Vendor name resolution priority
response.vendor_name = product.vendor_display_name || 
                      `${product.vendor_first_name || ''} ${product.vendor_last_name || ''}`.trim() ||
                      product.vendor_username;

// Optional image processing
if (includes.includes('images')) {
  response.images = images.map(img => img.image_url);
}

// Optional vendor detail processing
if (includes.includes('vendor')) {
  response.vendor = vendor[0] || {};
}
```

**Response Structure:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Abstract Painting",
      "description": "Beautiful artwork...",
      "price": 299.99,
      "marketplace_category": "unsorted",
      "vendor_name": "Jane Smith",
      "vendor_username": "janesmith",
      "images": ["https://api.beemeeart.com/api/images/product1.jpg"],
      "vendor": {
        "id": 456,
        "username": "janesmith",
        "business_name": "Smith Art Studio",
        "business_website": "https://smithart.com"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### Individual Product Categorization

### PUT /admin/marketplace/products/:id/categorize
**Purpose:** Move individual product to different marketplace category

**Authentication:** JWT token required + admin permissions

**Request Body:**
```json
{
  "category": "art",
  "reason": "High-quality fine art piece suitable for art marketplace"
}
```

**Database Operations:**
```sql
-- Verify product exists and is marketplace-enabled
SELECT id, marketplace_category, name, vendor_id 
FROM products 
WHERE id = ? AND marketplace_enabled = TRUE

-- Update product category
UPDATE products 
SET marketplace_category = ?, updated_at = NOW() 
WHERE id = ?

-- Create audit log entry
INSERT INTO marketplace_curation 
(product_id, previous_category, current_category, curated_by, curation_reason) 
VALUES (?, ?, ?, ?, ?)
```

**Audit Logging:**
```javascript
secureLogger.info('Product categorized', {
  productId: id,
  productName: currentProduct.name,
  previousCategory,
  newCategory: category,
  curatedBy: req.userId,
  reason
});
```

**Response Structure:**
```json
{
  "success": true,
  "product_id": 123,
  "previous_category": "unsorted",
  "new_category": "art"
}
```

### Bulk Product Categorization

### PUT /admin/marketplace/products/bulk-categorize
**Purpose:** Bulk move multiple products to different marketplace category

**Authentication:** JWT token required + admin permissions

**Request Body:**
```json
{
  "product_ids": [123, 124, 125],
  "category": "art",
  "reason": "Bulk categorization of fine art pieces"
}
```

**Transaction Processing:**
```sql
-- Start database transaction
START TRANSACTION

-- Verify all products exist and are marketplace-enabled
SELECT id, marketplace_category, name 
FROM products 
WHERE id IN (?, ?, ?) AND marketplace_enabled = TRUE

-- Bulk update all products
UPDATE products 
SET marketplace_category = ?, updated_at = NOW() 
WHERE id IN (?, ?, ?)

-- Create audit log entries for each product
INSERT INTO marketplace_curation 
(product_id, previous_category, current_category, curated_by, curation_reason) 
VALUES (?, ?, ?, ?, ?)
-- (repeated for each product)

COMMIT
```

**Error Handling:**
```javascript
// Validation checks
if (!Array.isArray(product_ids) || product_ids.length === 0) {
  return res.status(400).json({ error: 'product_ids must be a non-empty array' });
}

// Product existence verification
if (products.length !== product_ids.length) {
  return res.status(400).json({ 
    error: 'Some products not found or not enabled for marketplace',
    found: products.length,
    requested: product_ids.length
  });
}

// Transaction rollback on error
try {
  // ... bulk operations
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

**Response Structure:**
```json
{
  "success": true,
  "updated_count": 3,
  "category": "art"
}
```

## Curation Audit Trail

### GET /admin/marketplace/curation-log
**Purpose:** Get comprehensive curation history and audit trail

**Authentication:** JWT token required + admin permissions

**Database Query:**
```sql
SELECT mc.*, 
       p.name as product_name,
       u.username as curator_username,
       up.first_name as curator_first_name,
       up.last_name as curator_last_name
FROM marketplace_curation mc
JOIN products p ON mc.product_id = p.id
JOIN users u ON mc.curated_by = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY mc.curated_at DESC
LIMIT ? OFFSET ?
```

**Response Processing:**
```javascript
const processedLogs = logs.map(log => ({
  ...log,
  curator_name: `${log.curator_first_name || ''} ${log.curator_last_name || ''}`.trim() || log.curator_username
}));
```

**Response Structure:**
```json
{
  "logs": [
    {
      "id": 1,
      "product_id": 123,
      "product_name": "Abstract Painting",
      "previous_category": "unsorted",
      "current_category": "art",
      "curated_by": 456,
      "curator_name": "Admin User",
      "curator_username": "admin",
      "curation_reason": "High-quality fine art piece",
      "curated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

**Use Cases:**
- **Audit Compliance:** Track all curation decisions for regulatory compliance
- **Quality Control:** Review curation patterns and decision quality
- **Performance Metrics:** Analyze admin productivity and curation accuracy
- **Dispute Resolution:** Provide evidence for vendor disputes or appeals

## Application Management System

### GET /admin/marketplace/applications
**Purpose:** Get marketplace applications by status for admin review

**Authentication:** JWT token required + system management permissions

**Query Parameters:**
- `status` (string, default: 'pending'): Application status
  - `'pending'`: Applications awaiting review
  - `'approved'`: Approved applications
  - `'denied'`: Denied applications
- `limit` (number, default: 50): Number of applications to return
- `offset` (number, default: 0): Pagination offset

**Database Query:**
```sql
SELECT 
  ma.id, ma.user_id, ma.work_description, ma.additional_info, ma.profile_data,
  ma.marketplace_status, ma.marketplace_reviewed_by, ma.marketplace_review_date,
  ma.marketplace_admin_notes, ma.marketplace_denial_reason,
  ma.verification_status, ma.verification_reviewed_by, ma.verification_review_date,
  ma.verification_admin_notes, ma.verification_denial_reason,
  ma.created_at, ma.updated_at,
  u.username, up.first_name, up.last_name, ap.business_name,
  reviewer.username as reviewer_name,
  -- Media IDs for URL processing
  ma.raw_materials_media_id, ma.work_process_1_media_id, ma.work_process_2_media_id,
  ma.work_process_3_media_id, ma.artist_at_work_media_id, ma.booth_display_media_id,
  ma.artist_working_video_media_id, ma.artist_bio_video_media_id, ma.additional_video_media_id
FROM marketplace_applications ma
LEFT JOIN users u ON ma.user_id = u.id
LEFT JOIN user_profiles up ON ma.user_id = up.user_id
LEFT JOIN artist_profiles ap ON ma.user_id = ap.user_id
LEFT JOIN users reviewer ON ma.marketplace_reviewed_by = reviewer.id
WHERE ma.marketplace_status = ?
ORDER BY ma.created_at DESC
LIMIT ? OFFSET ?
```

**Media URL Processing:**
```javascript
// Collect all media IDs for batch processing
const mediaIds = [
  application.raw_materials_media_id,
  application.work_process_1_media_id,
  application.work_process_2_media_id,
  application.work_process_3_media_id,
  application.artist_at_work_media_id,
  application.booth_display_media_id,
  application.artist_working_video_media_id,
  application.artist_bio_video_media_id,
  application.additional_video_media_id
].filter(id => id !== null);

// Batch fetch media URLs
const [mediaUrls] = await db.query(
  `SELECT id, permanent_url FROM pending_images WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
  mediaIds
);

// Generate smart media URLs with environment variables
const mediaMapping = {};
mediaUrls.forEach(media => {
  if (media.permanent_url) {
    mediaMapping[media.id] = `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media.permanent_url}`;
  }
});

// Map media URLs to application fields
application.media_urls = {
  raw_materials: application.raw_materials_media_id ? mediaMapping[application.raw_materials_media_id] : null,
  work_process_1: application.work_process_1_media_id ? mediaMapping[application.work_process_1_media_id] : null,
  work_process_2: application.work_process_2_media_id ? mediaMapping[application.work_process_2_media_id] : null,
  work_process_3: application.work_process_3_media_id ? mediaMapping[application.work_process_3_media_id] : null,
  artist_at_work: application.artist_at_work_media_id ? mediaMapping[application.artist_at_work_media_id] : null,
  booth_display: application.booth_display_media_id ? mediaMapping[application.booth_display_media_id] : null,
  artist_working_video: application.artist_working_video_media_id ? mediaMapping[application.artist_working_video_media_id] : null,
  artist_bio_video: application.artist_bio_video_media_id ? mediaMapping[application.artist_bio_video_media_id] : null,
  additional_video: application.additional_video_media_id ? mediaMapping[application.additional_video_media_id] : null
};
```

**Response Structure:**
```json
{
  "applications": [
    {
      "id": 1,
      "user_id": 123,
      "username": "janesmith",
      "user_name": "Jane Smith",
      "business_name": "Smith Art Studio",
      "work_description": "I create abstract paintings using mixed media...",
      "additional_info": "I have been creating art for 10 years...",
      "marketplace_status": "pending",
      "verification_status": "approved",
      "created_at": "2024-01-15T10:30:00Z",
      "media_urls": {
        "raw_materials": "https://api.beemeeart.com/api/images/media/raw_materials_123.jpg",
        "work_process_1": "https://api.beemeeart.com/api/images/media/process1_123.jpg",
        "work_process_2": "https://api.beemeeart.com/api/images/media/process2_123.jpg",
        "work_process_3": "https://api.beemeeart.com/api/images/media/process3_123.jpg",
        "artist_at_work": "https://api.beemeeart.com/api/images/media/artist_work_123.jpg",
        "booth_display": "https://api.beemeeart.com/api/images/media/booth_123.jpg",
        "artist_working_video": "https://api.beemeeart.com/api/images/media/work_video_123.mp4",
        "artist_bio_video": "https://api.beemeeart.com/api/images/media/bio_video_123.mp4",
        "additional_video": null
      }
    }
  ],
  "total": 25,
  "status": "pending"
}
```

### Application Approval

### PUT /admin/marketplace/applications/:id/approve
**Purpose:** Approve marketplace application and grant user marketplace permissions

**Authentication:** JWT token required + system management permissions

**Request Body:**
```json
{
  "admin_notes": "Excellent portfolio demonstrating high-quality craftsmanship"
}
```

**Database Operations:**
```sql
-- Update application status
UPDATE marketplace_applications 
SET 
  marketplace_status = 'approved',
  marketplace_reviewed_by = ?,
  marketplace_review_date = NOW(),
  marketplace_admin_notes = ?,
  updated_at = NOW()
WHERE id = ?

-- Get user ID for permission update
SELECT user_id FROM marketplace_applications WHERE id = ?

-- Grant marketplace permissions to user
INSERT INTO user_permissions (user_id, marketplace) 
VALUES (?, 1) 
ON DUPLICATE KEY UPDATE marketplace = 1
```

**Audit Logging:**
```javascript
secureLogger.info('Marketplace application approved', {
  applicationId: id,
  userId: application[0].user_id,
  reviewerId,
  adminNotes: admin_notes
});
```

**Response Structure:**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "applicationId": 1
}
```

### Application Denial

### PUT /admin/marketplace/applications/:id/deny
**Purpose:** Deny marketplace application with required denial reason

**Authentication:** JWT token required + system management permissions

**Request Body:**
```json
{
  "denial_reason": "Portfolio does not meet quality standards for marketplace inclusion",
  "admin_notes": "Recommend improving photography and product presentation"
}
```

**Validation:**
```javascript
if (!denial_reason || !denial_reason.trim()) {
  return res.status(400).json({ error: 'Denial reason is required' });
}
```

**Database Operations:**
```sql
-- Update application status with denial information
UPDATE marketplace_applications 
SET 
  marketplace_status = 'denied',
  marketplace_reviewed_by = ?,
  marketplace_review_date = NOW(),
  marketplace_admin_notes = ?,
  marketplace_denial_reason = ?,
  updated_at = NOW()
WHERE id = ?

-- Ensure user does NOT have marketplace permissions
INSERT INTO user_permissions (user_id, marketplace) 
VALUES (?, 0) 
ON DUPLICATE KEY UPDATE marketplace = 0
```

**Response Structure:**
```json
{
  "success": true,
  "message": "Application denied successfully",
  "applicationId": 1
}
```

## Environment Variables

### SMART_MEDIA_BASE_URL
**Usage:** Base URL for smart media system and application media processing

**Implementation:**
```javascript
const mediaUrl = `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media.permanent_url}`;
```

**Purpose:**
- Constructs smart media URLs for application media files
- Replaces hardcoded `api2.onlineartfestival.com` with configurable domain
- Provides fallback to `api.beemeeart.com/api/images` if not configured
- Supports media processing for application review workflow

## Security Considerations

### Authentication & Authorization
- **JWT Authentication:** All endpoints require valid JWT tokens
- **Permission-Based Access:** 
  - Admin permissions required for product curation and statistics
  - System management permissions required for application processing
- **User Context:** All actions logged with admin user ID for accountability
- **Input Validation:** Comprehensive parameter validation and sanitization

### Data Security
- **SQL Injection Protection:** Parameterized queries throughout
- **Transaction Safety:** Database transactions for bulk operations
- **Audit Trail:** Complete logging of all administrative actions
- **Permission Management:** Automatic user permission updates based on application status

### Administrative Controls
- **Role Separation:** Different permission levels for different administrative functions
- **Audit Logging:** Comprehensive logging of all curation and approval actions
- **Reason Requirements:** Mandatory reasons for application denials
- **Bulk Operation Safety:** Transaction rollback on partial failures

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Optimized on marketplace_enabled, marketplace_category, status
- **Batch Processing:** Efficient media URL processing for applications
- **Transaction Management:** Proper transaction handling for bulk operations
- **Query Efficiency:** Optimized JOINs and conditional data loading

### Media Handling
- **Batch Media Processing:** Single query for multiple media URLs
- **Environment-Based URLs:** Flexible URL generation for different environments
- **Lazy Loading:** Media URLs only processed when applications are fetched
- **Fallback Handling:** Graceful handling of missing media files

### Scalability Features
- **Pagination:** Efficient handling of large datasets
- **Conditional Processing:** Only process required data based on includes
- **Bulk Operations:** Efficient bulk categorization with transaction safety
- **Stateless Design:** No server-side state for easy horizontal scaling

## Error Handling

### Validation Errors
- **Category Validation:** Ensures valid marketplace categories
- **Permission Validation:** Verifies admin and system management permissions
- **Input Validation:** Comprehensive validation of all request parameters
- **Existence Validation:** Verifies products and applications exist before operations

### Database Errors
- **Transaction Handling:** Proper rollback on bulk operation failures
- **Connection Handling:** Graceful handling of database connectivity issues
- **Constraint Violations:** Proper handling of database constraint violations
- **Data Consistency:** Ensures data integrity across related tables

### Application Processing Errors
- **Media Processing:** Graceful handling of missing or invalid media files
- **Permission Updates:** Error handling for user permission modifications
- **Audit Logging:** Ensures audit trail consistency even during errors
- **Status Transitions:** Validates application status transitions

## Logging and Monitoring

### Secure Logging
- **Administrative Actions:** All curation and approval actions logged
- **User Context:** Admin user ID included in all log entries
- **Error Logging:** Comprehensive error logging with context
- **Performance Metrics:** Query timing and response metrics

### Audit Trail
- **Curation History:** Complete history of product categorization decisions
- **Application Processing:** Full audit trail of application approvals and denials
- **Permission Changes:** Logging of user permission modifications
- **Bulk Operations:** Detailed logging of bulk administrative actions

### Monitoring Points
- **Application Queue:** Monitor pending application counts
- **Curation Backlog:** Track products awaiting categorization
- **Admin Activity:** Monitor administrative user activity patterns
- **System Performance:** Track response times and database performance

## Usage Examples

### Admin Dashboard Statistics
```javascript
// Get marketplace overview for admin dashboard
const getMarketplaceOverview = async (adminToken) => {
  const response = await fetch('/admin/marketplace/stats', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const stats = await response.json();
  
  console.log('Marketplace Overview:');
  console.log(`Total Products: ${stats.total_marketplace_products}`);
  console.log(`Awaiting Curation: ${stats.unsorted_count}`);
  console.log(`Art Products: ${stats.art_count}`);
  console.log(`Craft Products: ${stats.crafts_count}`);
  console.log(`Wholesale Products: ${stats.wholesale_count}`);
  
  console.log('\nUser Applications:');
  Object.entries(stats.user_permissions).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
  
  return stats;
};

// Use for admin dashboard
const overview = await getMarketplaceOverview(adminToken);
```

### Product Curation Workflow
```javascript
// Get products needing curation
const getCurationQueue = async (adminToken, category = 'unsorted') => {
  const response = await fetch(`/admin/marketplace/products?category=${category}&include=images,vendor&limit=20`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  console.log(`Products in ${category} category:`);
  data.products.forEach(product => {
    console.log(`- ${product.name} by ${product.vendor_name}`);
    console.log(`  Price: $${product.price}`);
    console.log(`  Images: ${product.images ? product.images.length : 0}`);
    if (product.vendor && product.vendor.business_name) {
      console.log(`  Business: ${product.vendor.business_name}`);
    }
    console.log('---');
  });
  
  return data;
};

// Categorize individual product
const categorizeProduct = async (adminToken, productId, category, reason) => {
  const response = await fetch(`/admin/marketplace/products/${productId}/categorize`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      category: category,
      reason: reason
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Product ${productId} moved from ${result.previous_category} to ${result.new_category}`);
  } else {
    console.error('Categorization failed:', result.error);
  }
  
  return result;
};

// Bulk categorize products
const bulkCategorize = async (adminToken, productIds, category, reason) => {
  const response = await fetch('/admin/marketplace/products/bulk-categorize', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product_ids: productIds,
      category: category,
      reason: reason
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Successfully categorized ${result.updated_count} products as ${result.category}`);
  } else {
    console.error('Bulk categorization failed:', result.error);
  }
  
  return result;
};

// Example curation workflow
const runCurationWorkflow = async (adminToken) => {
  // Get unsorted products
  const unsortedProducts = await getCurationQueue(adminToken, 'unsorted');
  
  // Example: categorize first 5 products as art
  const artProductIds = unsortedProducts.products.slice(0, 5).map(p => p.id);
  await bulkCategorize(adminToken, artProductIds, 'art', 'High-quality fine art pieces suitable for art marketplace');
  
  // Example: categorize individual product
  if (unsortedProducts.products.length > 5) {
    await categorizeProduct(
      adminToken, 
      unsortedProducts.products[5].id, 
      'crafts', 
      'Handmade craft item perfect for crafts marketplace'
    );
  }
};
```

### Application Review Workflow
```javascript
// Get pending applications for review
const getPendingApplications = async (systemManagerToken) => {
  const response = await fetch('/admin/marketplace/applications?status=pending&limit=10', {
    headers: {
      'Authorization': `Bearer ${systemManagerToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  console.log(`${data.applications.length} pending applications:`);
  data.applications.forEach(app => {
    console.log(`\nApplication ${app.id}:`);
    console.log(`User: ${app.user_name || app.username}`);
    console.log(`Business: ${app.business_name || 'N/A'}`);
    console.log(`Work Description: ${app.work_description.substring(0, 100)}...`);
    console.log(`Verification Status: ${app.verification_status}`);
    
    // List available media
    const mediaTypes = Object.entries(app.media_urls)
      .filter(([key, url]) => url !== null)
      .map(([key, url]) => key);
    console.log(`Media Available: ${mediaTypes.join(', ')}`);
  });
  
  return data;
};

// Approve application
const approveApplication = async (systemManagerToken, applicationId, adminNotes) => {
  const response = await fetch(`/admin/marketplace/applications/${applicationId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${systemManagerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      admin_notes: adminNotes
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Application ${applicationId} approved successfully`);
    console.log(`User now has marketplace access`);
  } else {
    console.error('Approval failed:', result.error);
  }
  
  return result;
};

// Deny application
const denyApplication = async (systemManagerToken, applicationId, denialReason, adminNotes) => {
  const response = await fetch(`/admin/marketplace/applications/${applicationId}/deny`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${systemManagerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      denial_reason: denialReason,
      admin_notes: adminNotes
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Application ${applicationId} denied`);
    console.log(`Reason: ${denialReason}`);
  } else {
    console.error('Denial failed:', result.error);
  }
  
  return result;
};

// Example application review workflow
const reviewApplications = async (systemManagerToken) => {
  const pendingApps = await getPendingApplications(systemManagerToken);
  
  // Example: approve first application
  if (pendingApps.applications.length > 0) {
    const firstApp = pendingApps.applications[0];
    await approveApplication(
      systemManagerToken,
      firstApp.id,
      'Excellent portfolio demonstrating high-quality craftsmanship and professional presentation'
    );
  }
  
  // Example: deny second application
  if (pendingApps.applications.length > 1) {
    const secondApp = pendingApps.applications[1];
    await denyApplication(
      systemManagerToken,
      secondApp.id,
      'Portfolio does not meet current quality standards for marketplace inclusion',
      'Recommend improving product photography and providing more detailed work process documentation'
    );
  }
};
```

### Audit Trail Analysis
```javascript
// Get curation history for analysis
const getCurationHistory = async (adminToken, limit = 100) => {
  const response = await fetch(`/admin/marketplace/curation-log?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  // Analyze curation patterns
  const curationStats = {
    totalActions: data.logs.length,
    categoryChanges: {},
    curatorActivity: {},
    recentActivity: data.logs.slice(0, 10)
  };
  
  data.logs.forEach(log => {
    // Track category change patterns
    const changeKey = `${log.previous_category} -> ${log.current_category}`;
    curationStats.categoryChanges[changeKey] = (curationStats.categoryChanges[changeKey] || 0) + 1;
    
    // Track curator activity
    curationStats.curatorActivity[log.curator_name] = (curationStats.curatorActivity[log.curator_name] || 0) + 1;
  });
  
  console.log('Curation Analysis:');
  console.log(`Total Actions: ${curationStats.totalActions}`);
  
  console.log('\nCategory Change Patterns:');
  Object.entries(curationStats.categoryChanges).forEach(([change, count]) => {
    console.log(`${change}: ${count} times`);
  });
  
  console.log('\nCurator Activity:');
  Object.entries(curationStats.curatorActivity).forEach(([curator, count]) => {
    console.log(`${curator}: ${count} actions`);
  });
  
  console.log('\nRecent Activity:');
  curationStats.recentActivity.forEach(log => {
    console.log(`${log.curated_at}: ${log.product_name} (${log.previous_category} -> ${log.current_category}) by ${log.curator_name}`);
  });
  
  return curationStats;
};

// Generate admin performance report
const generateAdminReport = async (adminToken) => {
  const [stats, curationHistory] = await Promise.all([
    getMarketplaceOverview(adminToken),
    getCurationHistory(adminToken, 200)
  ]);
  
  const report = {
    timestamp: new Date().toISOString(),
    marketplace_health: {
      total_products: stats.total_marketplace_products,
      curation_backlog: stats.unsorted_count,
      curation_completion_rate: ((stats.art_count + stats.crafts_count) / stats.total_marketplace_products * 100).toFixed(2) + '%'
    },
    curation_activity: {
      total_actions: curationHistory.totalActions,
      category_distribution: curationHistory.categoryChanges,
      curator_performance: curationHistory.curatorActivity
    },
    recommendations: []
  };
  
  // Generate recommendations
  if (stats.unsorted_count > 100) {
    report.recommendations.push('High curation backlog - consider additional admin resources');
  }
  
  if (Object.keys(curationHistory.curatorActivity).length < 3) {
    report.recommendations.push('Limited curator diversity - consider training additional admins');
  }
  
  console.log('=== ADMIN PERFORMANCE REPORT ===');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
};
```

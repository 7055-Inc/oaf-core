# Admin Marketplace API

## Overview
The Admin Marketplace API provides comprehensive administrative controls for marketplace management on the Beemeeart platform. This API handles product curation, vendor application approval, marketplace statistics, and administrative oversight. All endpoints require elevated permissions and are designed for administrative users only.

## Authentication
All admin marketplace endpoints require:
- **JWT Authentication:** Valid JWT token in Authorization header
- **Admin Permissions:** Either 'admin' or 'manage_system' permissions depending on endpoint
- **Secure Access:** HTTPS required for all administrative operations

## Base URL
```
https://api.beemeeart.com/admin/marketplace
```

## Permission Levels

### Admin Permission
Required for product curation and marketplace statistics:
- Product categorization (individual and bulk)
- Marketplace statistics access
- Curation history and audit trail

### System Management Permission
Required for application processing and user permissions:
- Marketplace application approval/denial
- User permission management
- Vendor access control

## Marketplace Statistics

### Get Marketplace Statistics
`GET /admin/marketplace/stats`

Get comprehensive marketplace curation statistics and metrics for administrative oversight.

**Authentication:** JWT token + admin permissions required

**Response (200 OK):**
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
- Admin dashboard overview
- Curation workload planning
- Marketplace health monitoring
- Performance metrics tracking

## Product Curation

### Get Products for Curation
`GET /admin/marketplace/products`

Get marketplace products by category for administrative curation and management.

**Authentication:** JWT token + admin permissions required

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

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Abstract Painting",
      "description": "Beautiful abstract artwork...",
      "price": 299.99,
      "wholesale_price": 199.99,
      "marketplace_category": "unsorted",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "vendor_id": 456,
      "vendor_name": "Jane Smith",
      "vendor_username": "janesmith",
      "images": [
        "https://api.beemeeart.com/api/images/product123_1.jpg",
        "https://api.beemeeart.com/api/images/product123_2.jpg"
      ],
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

### Categorize Individual Product
`PUT /admin/marketplace/products/:id/categorize`

Move individual product to different marketplace category with audit logging.

**Authentication:** JWT token + admin permissions required

**Path Parameters:**
- `id` (string): Product ID to categorize

**Request Body:**
```json
{
  "category": "art",
  "reason": "High-quality fine art piece suitable for art marketplace"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "product_id": 123,
  "previous_category": "unsorted",
  "new_category": "art"
}
```

**Features:**
- **Audit Trail:** Creates detailed log entry for curation tracking
- **Category Validation:** Ensures valid marketplace categories
- **Admin Attribution:** Links curation action to admin user

### Bulk Categorize Products
`PUT /admin/marketplace/products/bulk-categorize`

Bulk move multiple products to different marketplace category with transaction safety.

**Authentication:** JWT token + admin permissions required

**Request Body:**
```json
{
  "product_ids": [123, 124, 125, 126],
  "category": "art",
  "reason": "Bulk categorization of fine art pieces after quality review"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated_count": 4,
  "category": "art"
}
```

**Features:**
- **Transaction Safety:** Database transactions ensure data consistency
- **Batch Processing:** Efficient handling of multiple products
- **Comprehensive Logging:** Audit trail for each product in bulk operation
- **Validation:** Verifies all products exist and are marketplace-enabled

## Curation Audit Trail

### Get Curation History
`GET /admin/marketplace/curation-log`

Get comprehensive curation history and audit trail for administrative oversight.

**Authentication:** JWT token + admin permissions required

**Query Parameters:**
- `limit` (number, default: 50): Number of log entries to return
- `offset` (number, default: 0): Pagination offset

**Response (200 OK):**
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
      "curation_reason": "High-quality fine art piece suitable for art marketplace",
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
- Audit compliance and regulatory requirements
- Quality control and curation pattern analysis
- Administrative performance tracking
- Dispute resolution and appeals process

## Application Management

### Get Marketplace Applications
`GET /admin/marketplace/applications`

Get marketplace applications by status for administrative review and processing.

**Authentication:** JWT token + system management permissions required

**Query Parameters:**
- `status` (string, default: 'pending'): Application status filter
  - `'pending'`: Applications awaiting review
  - `'approved'`: Approved applications
  - `'denied'`: Denied applications
- `limit` (number, default: 50): Number of applications to return
- `offset` (number, default: 0): Pagination offset

**Response (200 OK):**
```json
{
  "applications": [
    {
      "id": 1,
      "user_id": 123,
      "username": "janesmith",
      "user_name": "Jane Smith",
      "business_name": "Smith Art Studio",
      "work_description": "I create abstract paintings using mixed media techniques...",
      "additional_info": "I have been creating art for over 10 years...",
      "marketplace_status": "pending",
      "verification_status": "approved",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "reviewer_name": null,
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

**Features:**
- **Complete Media URLs:** All application media processed and accessible
- **User Information:** Comprehensive applicant details for review
- **Status Tracking:** Clear application status and review history
- **Reviewer Attribution:** Track which admin reviewed each application

### Approve Marketplace Application
`PUT /admin/marketplace/applications/:id/approve`

Approve marketplace application and automatically grant user marketplace permissions.

**Authentication:** JWT token + system management permissions required

**Path Parameters:**
- `id` (string): Application ID to approve

**Request Body:**
```json
{
  "admin_notes": "Excellent portfolio demonstrating high-quality craftsmanship and professional presentation"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "applicationId": 1
}
```

**Automatic Actions:**
- Updates application status to 'approved'
- Records admin user and approval timestamp
- Grants marketplace permissions to user
- Creates audit log entry

### Deny Marketplace Application
`PUT /admin/marketplace/applications/:id/deny`

Deny marketplace application with required denial reason and revoke marketplace permissions.

**Authentication:** JWT token + system management permissions required

**Path Parameters:**
- `id` (string): Application ID to deny

**Request Body:**
```json
{
  "denial_reason": "Portfolio does not meet current quality standards for marketplace inclusion",
  "admin_notes": "Recommend improving product photography and providing more detailed work process documentation"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application denied successfully",
  "applicationId": 1
}
```

**Automatic Actions:**
- Updates application status to 'denied'
- Records denial reason and admin notes
- Ensures user does NOT have marketplace permissions
- Creates audit log entry

**Requirements:**
- `denial_reason` is mandatory for all denials
- Admin notes are optional but recommended
- Denial reason is stored for applicant feedback

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (invalid parameters, missing required fields)
- `401` - Unauthorized (invalid or missing JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (product, application, or resource not found)
- `500` - Internal Server Error (system error)

### Specific Validation Errors
- **Invalid category:** Must be 'unsorted', 'art', or 'crafts'
- **Invalid status:** Must be 'pending', 'approved', or 'denied'
- **Missing denial reason:** Required for application denials
- **Product not found:** Product doesn't exist or not marketplace-enabled
- **Permission denied:** User lacks required admin or system management permissions

## Rate Limits
- **Statistics:** 1000 requests per hour per admin user
- **Product curation:** 500 requests per hour per admin user
- **Application processing:** 200 requests per hour per system manager
- **Audit trail:** 2000 requests per hour per admin user

## Integration Examples

### Admin Dashboard Integration
```javascript
// Complete admin dashboard data fetch
const buildAdminDashboard = async (adminToken) => {
  try {
    // Get marketplace statistics
    const statsResponse = await fetch('/admin/marketplace/stats', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const stats = await statsResponse.json();
    
    // Get products needing curation
    const unsortedResponse = await fetch('/admin/marketplace/products?category=unsorted&limit=10', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const unsortedProducts = await unsortedResponse.json();
    
    // Get recent curation activity
    const curationResponse = await fetch('/admin/marketplace/curation-log?limit=5', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const recentCuration = await curationResponse.json();
    
    const dashboard = {
      statistics: stats,
      curation_queue: unsortedProducts.products,
      recent_activity: recentCuration.logs,
      alerts: []
    };
    
    // Generate alerts
    if (stats.unsorted_count > 100) {
      dashboard.alerts.push({
        type: 'warning',
        message: `${stats.unsorted_count} products awaiting curation`
      });
    }
    
    console.log('Admin Dashboard Data:');
    console.log(`Total Products: ${dashboard.statistics.total_marketplace_products}`);
    console.log(`Curation Queue: ${dashboard.statistics.unsorted_count}`);
    console.log(`Recent Activity: ${dashboard.recent_activity.length} actions`);
    console.log(`Alerts: ${dashboard.alerts.length}`);
    
    return dashboard;
    
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    throw error;
  }
};

// Use in admin interface
const adminDashboard = await buildAdminDashboard(adminToken);
```

### Product Curation Workflow
```javascript
// Complete product curation workflow
const runCurationWorkflow = async (adminToken) => {
  try {
    // Get products needing curation with full details
    const response = await fetch('/admin/marketplace/products?category=unsorted&include=images,vendor&limit=20', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`Found ${data.products.length} products needing curation`);
    
    // Example: categorize products based on criteria
    const artProducts = [];
    const craftProducts = [];
    
    data.products.forEach(product => {
      // Simple categorization logic (in real app, this would be more sophisticated)
      if (product.name.toLowerCase().includes('painting') || 
          product.name.toLowerCase().includes('sculpture') ||
          product.description.toLowerCase().includes('fine art')) {
        artProducts.push(product.id);
      } else if (product.name.toLowerCase().includes('handmade') ||
                 product.name.toLowerCase().includes('craft') ||
                 product.description.toLowerCase().includes('handcrafted')) {
        craftProducts.push(product.id);
      }
    });
    
    // Bulk categorize art products
    if (artProducts.length > 0) {
      const artResponse = await fetch('/admin/marketplace/products/bulk-categorize', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_ids: artProducts,
          category: 'art',
          reason: 'Automated categorization based on product keywords and description analysis'
        })
      });
      
      const artResult = await artResponse.json();
      console.log(`Categorized ${artResult.updated_count} products as art`);
    }
    
    // Bulk categorize craft products
    if (craftProducts.length > 0) {
      const craftResponse = await fetch('/admin/marketplace/products/bulk-categorize', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_ids: craftProducts,
          category: 'crafts',
          reason: 'Automated categorization based on handmade and craft keywords'
        })
      });
      
      const craftResult = await craftResponse.json();
      console.log(`Categorized ${craftResult.updated_count} products as crafts`);
    }
    
    // Individual categorization for remaining products
    const remainingProducts = data.products.filter(p => 
      !artProducts.includes(p.id) && !craftProducts.includes(p.id)
    );
    
    for (const product of remainingProducts.slice(0, 5)) { // Limit to 5 for example
      // Manual review required - categorize individually
      const category = product.price > 500 ? 'art' : 'crafts'; // Simple price-based logic
      
      const individualResponse = await fetch(`/admin/marketplace/products/${product.id}/categorize`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: category,
          reason: `Manual review - categorized as ${category} based on price point and product characteristics`
        })
      });
      
      const result = await individualResponse.json();
      if (result.success) {
        console.log(`Product ${product.name} categorized as ${category}`);
      }
    }
    
    return {
      processed: artProducts.length + craftProducts.length + Math.min(remainingProducts.length, 5),
      art_count: artProducts.length,
      craft_count: craftProducts.length,
      manual_count: Math.min(remainingProducts.length, 5)
    };
    
  } catch (error) {
    console.error('Curation workflow error:', error);
    throw error;
  }
};

// Execute curation workflow
const curationResults = await runCurationWorkflow(adminToken);
console.log('Curation completed:', curationResults);
```

### Application Review System
```javascript
// Complete application review system
const processApplicationQueue = async (systemManagerToken) => {
  try {
    // Get pending applications
    const response = await fetch('/admin/marketplace/applications?status=pending&limit=10', {
      headers: {
        'Authorization': `Bearer ${systemManagerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`Found ${data.applications.length} pending applications`);
    
    const results = {
      reviewed: 0,
      approved: 0,
      denied: 0,
      errors: []
    };
    
    for (const application of data.applications) {
      try {
        console.log(`\nReviewing application ${application.id} from ${application.user_name || application.username}`);
        
        // Application review criteria (simplified for example)
        const hasBusinessName = !!application.business_name;
        const hasWorkDescription = application.work_description && application.work_description.length > 50;
        const hasMedia = Object.values(application.media_urls).some(url => url !== null);
        const isVerified = application.verification_status === 'approved';
        
        const qualityScore = [hasBusinessName, hasWorkDescription, hasMedia, isVerified]
          .filter(Boolean).length;
        
        console.log(`Quality Score: ${qualityScore}/4`);
        console.log(`Business: ${hasBusinessName ? 'Yes' : 'No'}`);
        console.log(`Description: ${hasWorkDescription ? 'Adequate' : 'Too short'}`);
        console.log(`Media: ${hasMedia ? 'Present' : 'Missing'}`);
        console.log(`Verified: ${isVerified ? 'Yes' : 'No'}`);
        
        if (qualityScore >= 3) {
          // Approve application
          const approveResponse = await fetch(`/admin/marketplace/applications/${application.id}/approve`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${systemManagerToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              admin_notes: `Application approved with quality score ${qualityScore}/4. ${hasBusinessName ? 'Professional business presence. ' : ''}${hasWorkDescription ? 'Comprehensive work description. ' : ''}${hasMedia ? 'Media portfolio provided. ' : ''}${isVerified ? 'User verification completed.' : ''}`
            })
          });
          
          const approveResult = await approveResponse.json();
          if (approveResult.success) {
            console.log(`✅ Approved application ${application.id}`);
            results.approved++;
          } else {
            console.error(`❌ Failed to approve application ${application.id}:`, approveResult.error);
            results.errors.push(`Approval failed for ${application.id}: ${approveResult.error}`);
          }
          
        } else {
          // Deny application
          const denialReasons = [];
          if (!hasBusinessName) denialReasons.push('missing professional business information');
          if (!hasWorkDescription) denialReasons.push('insufficient work description');
          if (!hasMedia) denialReasons.push('no media portfolio provided');
          if (!isVerified) denialReasons.push('user verification not completed');
          
          const denialReason = `Application does not meet minimum requirements: ${denialReasons.join(', ')}`;
          const adminNotes = `Quality score: ${qualityScore}/4. To reapply, please address: ${denialReasons.join('; ')}.`;
          
          const denyResponse = await fetch(`/admin/marketplace/applications/${application.id}/deny`, {
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
          
          const denyResult = await denyResponse.json();
          if (denyResult.success) {
            console.log(`❌ Denied application ${application.id}`);
            results.denied++;
          } else {
            console.error(`❌ Failed to deny application ${application.id}:`, denyResult.error);
            results.errors.push(`Denial failed for ${application.id}: ${denyResult.error}`);
          }
        }
        
        results.reviewed++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing application ${application.id}:`, error);
        results.errors.push(`Processing error for ${application.id}: ${error.message}`);
      }
    }
    
    console.log('\n=== APPLICATION REVIEW SUMMARY ===');
    console.log(`Total Reviewed: ${results.reviewed}`);
    console.log(`Approved: ${results.approved}`);
    console.log(`Denied: ${results.denied}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('Application processing error:', error);
    throw error;
  }
};

// Execute application review
const reviewResults = await processApplicationQueue(systemManagerToken);
```

### Audit Trail Analysis
```javascript
// Comprehensive audit trail analysis
const analyzeMarketplaceActivity = async (adminToken) => {
  try {
    // Get comprehensive curation history
    const curationResponse = await fetch('/admin/marketplace/curation-log?limit=200', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const curationData = await curationResponse.json();
    
    // Get current statistics
    const statsResponse = await fetch('/admin/marketplace/stats', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const stats = await statsResponse.json();
    
    // Analyze curation patterns
    const analysis = {
      overview: {
        total_products: stats.total_marketplace_products,
        curation_actions: curationData.logs.length,
        curation_rate: (curationData.logs.length / stats.total_marketplace_products * 100).toFixed(2) + '%'
      },
      category_transitions: {},
      curator_performance: {},
      time_analysis: {
        last_24h: 0,
        last_7d: 0,
        last_30d: 0
      },
      quality_metrics: {
        avg_actions_per_product: (curationData.logs.length / stats.total_marketplace_products).toFixed(2),
        most_active_curator: null,
        most_common_transition: null
      }
    };
    
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    
    curationData.logs.forEach(log => {
      // Analyze category transitions
      const transition = `${log.previous_category} → ${log.current_category}`;
      analysis.category_transitions[transition] = (analysis.category_transitions[transition] || 0) + 1;
      
      // Analyze curator performance
      const curator = log.curator_name;
      if (!analysis.curator_performance[curator]) {
        analysis.curator_performance[curator] = {
          total_actions: 0,
          categories: { art: 0, crafts: 0, unsorted: 0 },
          recent_activity: 0
        };
      }
      analysis.curator_performance[curator].total_actions++;
      analysis.curator_performance[curator].categories[log.current_category]++;
      
      // Time-based analysis
      const logDate = new Date(log.curated_at);
      const timeDiff = now - logDate;
      
      if (timeDiff <= day) {
        analysis.time_analysis.last_24h++;
        analysis.curator_performance[curator].recent_activity++;
      } else if (timeDiff <= 7 * day) {
        analysis.time_analysis.last_7d++;
      } else if (timeDiff <= 30 * day) {
        analysis.time_analysis.last_30d++;
      }
    });
    
    // Calculate quality metrics
    const curatorEntries = Object.entries(analysis.curator_performance);
    if (curatorEntries.length > 0) {
      analysis.quality_metrics.most_active_curator = curatorEntries
        .sort(([,a], [,b]) => b.total_actions - a.total_actions)[0][0];
    }
    
    const transitionEntries = Object.entries(analysis.category_transitions);
    if (transitionEntries.length > 0) {
      analysis.quality_metrics.most_common_transition = transitionEntries
        .sort(([,a], [,b]) => b - a)[0][0];
    }
    
    // Generate report
    console.log('=== MARKETPLACE ACTIVITY ANALYSIS ===\n');
    
    console.log('Overview:');
    console.log(`Total Products: ${analysis.overview.total_products}`);
    console.log(`Curation Actions: ${analysis.overview.curation_actions}`);
    console.log(`Curation Rate: ${analysis.overview.curation_rate}`);
    
    console.log('\nCategory Transitions:');
    Object.entries(analysis.category_transitions)
      .sort(([,a], [,b]) => b - a)
      .forEach(([transition, count]) => {
        console.log(`${transition}: ${count} times`);
      });
    
    console.log('\nCurator Performance:');
    Object.entries(analysis.curator_performance)
      .sort(([,a], [,b]) => b.total_actions - a.total_actions)
      .forEach(([curator, data]) => {
        console.log(`${curator}: ${data.total_actions} actions (Art: ${data.categories.art}, Crafts: ${data.categories.crafts}, Recent: ${data.recent_activity})`);
      });
    
    console.log('\nActivity Timeline:');
    console.log(`Last 24 hours: ${analysis.time_analysis.last_24h} actions`);
    console.log(`Last 7 days: ${analysis.time_analysis.last_7d} actions`);
    console.log(`Last 30 days: ${analysis.time_analysis.last_30d} actions`);
    
    console.log('\nQuality Metrics:');
    console.log(`Average actions per product: ${analysis.quality_metrics.avg_actions_per_product}`);
    console.log(`Most active curator: ${analysis.quality_metrics.most_active_curator}`);
    console.log(`Most common transition: ${analysis.quality_metrics.most_common_transition}`);
    
    return analysis;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};

// Generate comprehensive analysis
const marketplaceAnalysis = await analyzeMarketplaceActivity(adminToken);
```

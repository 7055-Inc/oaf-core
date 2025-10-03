# Returns - Internal Documentation

## Overview
Comprehensive return management system handling the complete return lifecycle from customer request to vendor processing and refund completion. This system supports multiple return flows, automated label generation, case messaging, and administrative oversight.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for admin access
  - Secure logger for audit trails
  - Shipping service for label generation
  - File system operations for label storage
- **Database Tables:** 
  - `returns` - Main return records with status tracking
  - `orders` - Order information (joined)
  - `order_items` - Specific items being returned (joined)
  - `products` - Product information and return policies (joined)
  - `users` - Customer and vendor information (joined)
  - `shipping_labels` - Return shipping labels
- **External APIs:** 
  - USPS/UPS/FedEx shipping APIs (via shipping service)
  - File system for PDF label storage

## Functions/Endpoints

### Customer Return Management
#### POST /create
- **Purpose:** Create new return request with flow-specific processing
- **Parameters:** Order details, return reason, package info, flow type (A/B/C)
- **Returns:** Return ID, status, and next steps based on flow type
- **Errors:** 400 for validation errors, 404 for invalid orders, 500 for processing errors
- **Usage Example:** Customer initiating return from order history

**Flow Types:**
- **Flow A:** Auto prepaid label - System generates label automatically
- **Flow B:** Customer choice - Customer chooses to purchase label or self-ship
- **Flow C:** Admin/vendor case - Requires manual review and communication

#### GET /my
- **Purpose:** Retrieve user's return requests with optional status filtering
- **Parameters:** Optional status query parameter
- **Returns:** Array of return requests with order and product details
- **Errors:** 500 for database errors
- **Usage Example:** Customer viewing return history

#### POST /:id/message
- **Purpose:** Add message to return case for Flow C communication
- **Parameters:** Return ID, message content
- **Returns:** Success confirmation and updated status
- **Errors:** 400 for missing message, 404 for invalid return, 500 for processing errors
- **Usage Example:** Customer responding to vendor inquiry

#### GET /:id/label
- **Purpose:** Download return shipping label PDF
- **Parameters:** Return ID in URL path
- **Returns:** PDF file stream with appropriate headers
- **Errors:** 404 for missing return or label, 500 for file access errors
- **Usage Example:** Customer downloading prepaid return label

### Vendor Return Management
#### GET /vendor/my
- **Purpose:** Get vendor's return requests with filtering
- **Parameters:** Optional status query parameter
- **Returns:** Array of returns for vendor's products
- **Errors:** 500 for database errors
- **Usage Example:** Vendor reviewing incoming returns

#### POST /:id/vendor-message
- **Purpose:** Vendor adds message to return case
- **Parameters:** Return ID, vendor message
- **Returns:** Success confirmation
- **Errors:** 400 for missing message, 404 for invalid return, 500 for processing errors
- **Usage Example:** Vendor responding to customer return inquiry

#### POST /:id/mark-received
- **Purpose:** Vendor confirms return receipt and triggers refund
- **Parameters:** Return ID in URL path
- **Returns:** Success confirmation and refund processing status
- **Errors:** 404 for invalid return or wrong status, 500 for processing errors
- **Usage Example:** Vendor confirming physical return receipt

### Administrative Management
#### GET /admin/all
- **Purpose:** Get all returns with search and filter capabilities
- **Parameters:** Search term, vendor filter
- **Returns:** Comprehensive return list with customer and vendor details
- **Errors:** 500 for database errors
- **Usage Example:** Admin dashboard return overview

#### GET /admin/by-status/:status
- **Purpose:** Get returns filtered by specific status
- **Parameters:** Status in URL path
- **Returns:** Returns matching specified status
- **Errors:** 500 for database errors
- **Usage Example:** Admin reviewing returns needing attention

#### POST /:id/admin-message
- **Purpose:** Admin adds message to return case
- **Parameters:** Return ID, admin message
- **Returns:** Success confirmation
- **Errors:** 400 for missing message, 404 for invalid return, 500 for processing errors
- **Usage Example:** Admin providing guidance on complex return

## Helper Functions

### createReturnLabel(returnId, vendorId, customerAddress, packageDimensions)
- **Purpose:** Generate return shipping label using shipping service
- **Parameters:** Return details, addresses, and package information
- **Returns:** Label creation result with URL, tracking, and cost
- **Errors:** Returns error object if label generation fails
- **Usage Example:** Automatic label creation for Flow A returns

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on shipping service configuration for label generation
- Uses file system paths for label storage

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Users can only access their own returns, vendors their products' returns
- **Admin Access:** Admin endpoints require 'manage_system' permission
- **Input Validation:** All return data validated before processing
- **Audit Logging:** Secure logging for all return operations
- **File Security:** Return labels stored with secure filenames and access control

## Return Flow Types
### Flow A: Auto Prepaid Label
- **Process:** System automatically generates prepaid return label
- **Status:** pending → label_created → shipped → received → processed
- **Use Case:** Standard returns with automatic processing

### Flow B: Customer Choice
- **Process:** Customer chooses to purchase label or self-ship
- **Status:** pending → (label_purchased OR self_shipped) → received → processed
- **Use Case:** Flexible return options for customer preference

### Flow C: Admin/Vendor Case
- **Process:** Manual review with messaging system
- **Status:** assistance → assistance_vendor → (resolved OR escalated)
- **Use Case:** Complex returns requiring human intervention

## Return Status Lifecycle
1. **pending** - Return request created, awaiting processing
2. **label_created** - Return label generated and ready
3. **shipped** - Customer has shipped return package
4. **received** - Vendor confirms receipt of return
5. **processed** - Return processed, refund initiated
6. **refunded** - Refund completed
7. **denied** - Return request denied
8. **assistance** - Requires customer service intervention
9. **assistance_vendor** - Vendor response needed

## Testing
- **Unit Tests:** Should cover all return flow types and status transitions
- **Integration Tests:** Test label generation and file operations
- **Security Tests:** Verify access control and permission enforcement
- **Flow Tests:** Test complete return lifecycle for each flow type
- **Error Handling:** Test various failure scenarios and recovery

## Performance Considerations
- **Database Indexing:** Ensure indexes on user_id, vendor_id, and status fields
- **File Storage:** Monitor disk usage for return label PDFs
- **Label Generation:** Rate limiting for shipping API calls
- **Query Optimization:** Complex joins should be optimized for large datasets
- **Caching:** Consider caching frequently accessed return policies

## Monitoring and Logging
- **Return Metrics:** Track return rates by product and vendor
- **Flow Analytics:** Monitor which return flows are most used
- **Processing Times:** Track time from request to resolution
- **Error Tracking:** Monitor label generation failures and file access issues
- **Audit Trail:** Complete logging of all return status changes

## Future Enhancements
- **Automated Refunds:** Integrate with payment processing for automatic refunds
- **Return Analytics:** Advanced reporting on return patterns and reasons
- **Bulk Processing:** Admin tools for processing multiple returns
- **Return Policies:** Product-specific return policy enforcement
- **Integration APIs:** Webhook notifications for return status changes
- **Mobile Support:** Optimized return flows for mobile applications

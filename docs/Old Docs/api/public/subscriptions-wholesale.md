# Wholesale Subscriptions API

## Authentication
All wholesale subscription endpoints require API key authentication. Admin endpoints require additional system management permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Terms Management

#### Check Terms Acceptance
`GET /api/subscriptions/wholesale/terms-check`

Check if the authenticated user has accepted the latest wholesale terms.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "termsAccepted": true,
  "latestTerms": {
    "id": 456,
    "title": "Wholesale Buyer Terms",
    "content": "By applying for wholesale access, you agree to...",
    "version": "1.3",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

**Response (200 OK - Terms Not Accepted):**
```json
{
  "success": true,
  "termsAccepted": false,
  "latestTerms": {
    "id": 456,
    "title": "Wholesale Buyer Terms",
    "content": "By applying for wholesale access, you agree to...",
    "version": "1.3",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

#### Accept Terms
`POST /api/subscriptions/wholesale/terms-accept`

Record user acceptance of wholesale terms.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "terms_version_id": 456
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Terms acceptance recorded successfully"
}
```

### Application Management

#### Submit Application
`POST /api/subscriptions/wholesale/apply`

Submit wholesale buyer application with complete business information.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "business_name": "Artisan Retail Co.",
  "business_type": "Retail Store",
  "tax_id": "12-3456789",
  "business_address": "123 Commerce St",
  "business_city": "New York",
  "business_state": "NY",
  "business_zip": "10001",
  "business_phone": "+1-555-123-4567",
  "business_email": "orders@artisanretail.com",
  "contact_name": "Jane Smith",
  "contact_title": "Purchasing Manager",
  "years_in_business": 5,
  "business_description": "Specialty retail store focusing on handmade artisan products",
  "product_categories": "Home decor, jewelry, pottery, textiles",
  "expected_order_volume": "$5,000-$10,000 per month",
  "website_url": "https://artisanretail.com",
  "resale_certificate": "NY-RST-123456789",
  "additional_info": "We specialize in supporting local artists and makers"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Wholesale application submitted successfully",
  "application_id": 789
}
```

### Admin Management

#### Get Applications
`GET /api/subscriptions/wholesale/admin/applications`

Get wholesale applications filtered by status (Admin only).

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires system management permissions

**Query Parameters:**
- `status` (optional): Filter by application status (`pending`, `approved`, `denied`, `under_review`)

**Response (200 OK):**
```json
{
  "success": true,
  "applications": [
    {
      "id": 789,
      "user_id": 123,
      "business_name": "Artisan Retail Co.",
      "business_type": "Retail Store",
      "tax_id": "12-3456789",
      "business_address": "123 Commerce St",
      "business_city": "New York",
      "business_state": "NY",
      "business_zip": "10001",
      "business_phone": "+1-555-123-4567",
      "business_email": "orders@artisanretail.com",
      "contact_name": "Jane Smith",
      "contact_title": "Purchasing Manager",
      "years_in_business": 5,
      "business_description": "Specialty retail store focusing on handmade artisan products",
      "product_categories": "Home decor, jewelry, pottery, textiles",
      "expected_order_volume": "$5,000-$10,000 per month",
      "website_url": "https://artisanretail.com",
      "resale_certificate": "NY-RST-123456789",
      "additional_info": "We specialize in supporting local artists and makers",
      "status": "pending",
      "created_at": "2025-09-17T19:30:00Z",
      "reviewed_by": null,
      "review_date": null,
      "admin_notes": null,
      "denial_reason": null,
      "username": "janesmith",
      "user_full_name": "Jane Smith"
    }
  ]
}
```

#### Approve Application
`PUT /api/subscriptions/wholesale/admin/applications/:id/approve`

Approve wholesale application and grant wholesale access (Admin only).

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires system management permissions

**Request Body:**
```json
{
  "admin_notes": "Business meets all requirements for wholesale access"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application approved successfully"
}
```

#### Deny Application
`PUT /api/subscriptions/wholesale/admin/applications/:id/deny`

Deny wholesale application with reason (Admin only).

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires system management permissions

**Request Body:**
```json
{
  "denial_reason": "Insufficient business documentation provided",
  "admin_notes": "Please provide additional business verification documents"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application denied successfully"
}
```

#### Get Statistics
`GET /api/subscriptions/wholesale/admin/stats`

Get wholesale application statistics (Admin only).

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires system management permissions

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total_applications": 150,
    "pending_count": 25,
    "approved_count": 98,
    "denied_count": 22,
    "under_review_count": 5
  }
}
```

## Application Requirements

### Required Fields
All wholesale applications must include the following information:

#### Business Information
- **business_name**: Legal business name
- **business_type**: Type of business (e.g., "Retail Store", "Online Retailer", "Distributor")
- **tax_id**: Business tax identification number
- **years_in_business**: Number of years in operation

#### Business Address
- **business_address**: Street address
- **business_city**: City
- **business_state**: State or province
- **business_zip**: ZIP or postal code

#### Contact Information
- **business_phone**: Primary business phone number
- **business_email**: Business email address
- **contact_name**: Primary contact person
- **contact_title**: Contact person's title or position (optional)

#### Business Profile
- **business_description**: Description of business and target market
- **product_categories**: Types of products interested in purchasing
- **expected_order_volume**: Expected monthly or annual order volume

#### Optional Information
- **website_url**: Business website URL
- **resale_certificate**: Resale certificate number or tax exemption info
- **additional_info**: Any additional relevant information

### Application Status Flow
1. **pending**: Initial status after submission
2. **under_review**: Admin has started reviewing the application
3. **approved**: Application approved, wholesale access granted
4. **denied**: Application rejected with reason provided

## Business Rules

### Application Submission
- Users can only have one active application at a time
- All required fields must be provided
- Terms must be accepted before application submission
- Applications cannot be modified after submission

### Admin Review Process
- Only users with system management permissions can review applications
- Approval automatically grants wholesale user type and permissions
- Denial requires a reason for audit purposes
- All admin actions are logged with timestamps and admin user ID

### Wholesale Access
- Approved users receive wholesale user type designation
- Wholesale permissions are automatically granted upon approval
- Access includes wholesale pricing and bulk ordering features
- Wholesale status is permanent unless manually revoked

## Error Responses

- `400 Bad Request`: Invalid input data or business rule violations
  - Missing required fields
  - User already has active application
  - Missing denial reason (for deny endpoint)
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions for admin endpoints
- `404 Not Found`: 
  - Terms version not found
  - Application not found (for admin actions)
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 50 requests per minute per API key for application submission
- 100 requests per minute per API key for terms management
- 200 requests per minute per API key for admin endpoints

## Example Usage

### Complete Application Flow
```bash
# 1. Check current terms
curl -X GET https://api.beemeeart.com/api/subscriptions/wholesale/terms-check \
  -H "Authorization: Bearer your_api_key"

# 2. Accept terms (if not already accepted)
curl -X POST https://api.beemeeart.com/api/subscriptions/wholesale/terms-accept \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"terms_version_id": 456}'

# 3. Submit application
curl -X POST https://api.beemeeart.com/api/subscriptions/wholesale/apply \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Artisan Retail Co.",
    "business_type": "Retail Store",
    "tax_id": "12-3456789",
    "business_address": "123 Commerce St",
    "business_city": "New York",
    "business_state": "NY",
    "business_zip": "10001",
    "business_phone": "+1-555-123-4567",
    "business_email": "orders@artisanretail.com",
    "contact_name": "Jane Smith",
    "years_in_business": 5,
    "business_description": "Specialty retail store",
    "product_categories": "Home decor, jewelry",
    "expected_order_volume": "$5,000-$10,000 per month"
  }'
```

### Admin Management Flow
```bash
# 1. Get pending applications
curl -X GET "https://api.beemeeart.com/api/subscriptions/wholesale/admin/applications?status=pending" \
  -H "Authorization: Bearer admin_api_key"

# 2. Approve application
curl -X PUT https://api.beemeeart.com/api/subscriptions/wholesale/admin/applications/789/approve \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{"admin_notes": "Business meets all requirements"}'

# 3. Get application statistics
curl -X GET https://api.beemeeart.com/api/subscriptions/wholesale/admin/stats \
  -H "Authorization: Bearer admin_api_key"
```

### Application Denial Example
```bash
curl -X PUT https://api.beemeeart.com/api/subscriptions/wholesale/admin/applications/789/deny \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "denial_reason": "Insufficient business documentation",
    "admin_notes": "Please provide business license and tax documentation"
  }'
```

## Integration Notes

### User Type Management
- Approved applications automatically update user type to 'wholesale'
- Wholesale users gain access to special pricing and bulk features
- User type changes are permanent and affect all marketplace interactions

### Permission System
- Wholesale permissions are granted automatically upon approval
- System gracefully handles permission table variations
- Permission changes take effect immediately

### Admin Dashboard Integration
- Applications integrate with admin management interfaces
- Statistics support dashboard reporting and analytics
- Bulk operations can be built on top of individual approval/denial endpoints

## Best Practices

### Application Submission
- Validate all required fields before submission
- Provide clear error messages for missing information
- Guide users through the application process step by step
- Ensure terms are accepted before allowing application submission

### Admin Review
- Review applications promptly to maintain good user experience
- Provide clear and constructive feedback in admin notes
- Use denial reasons that help applicants understand requirements
- Monitor application statistics to identify process improvements

### Error Handling
- Implement proper error handling for all scenarios
- Provide meaningful error messages to users and admins
- Handle duplicate applications gracefully
- Validate all input parameters before processing

### Security Considerations
- Validate all user inputs thoroughly
- Ensure proper permission checks for admin endpoints
- Audit all admin actions for compliance
- Protect sensitive business information appropriately

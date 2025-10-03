# users.js - Internal Documentation

## Overview
User management routes for the Beemeeart platform. Handles comprehensive user profile CRUD operations, profile completion workflows, and user type management. Supports multi-profile system with artist, promoter, community, and admin profile types.

## Architecture
- **Type:** Route Layer (API Endpoints) - User Management & Profiles
- **Dependencies:** express, database connection, jwt middleware, multer upload, mediaUtils
- **Database Tables:**
  - `users` - Core user accounts and authentication
  - `user_profiles` - Base profile information (shared across all user types)
  - `artist_profiles` - Artist-specific profile data and business information
  - `promoter_profiles` - Event promoter profile data and organization details
  - `community_profiles` - Community member preferences and interests
  - `admin_profiles` - Administrative profile data
  - `user_permissions` - Granular permission system
  - `user_addons` - Active user addon subscriptions
  - `website_addons` - Available addon definitions
  - `marketplace_applications` - Artist marketplace jury applications
  - `pending_images` - Uploaded media files pending processing
  - `shipping_policies` - Vendor shipping policies
  - `return_policies` - Vendor return policies
- **External Services:** File upload processing, media enhancement utilities

## User Profile Endpoints

### GET /users/me
**Purpose:** Fetch current authenticated user's complete profile

**Authentication:** Required - JWT token

**Profile Data Included:**
- **Base Profile:** Personal information, contact details, social media
- **Type-Specific Profile:** Artist, promoter, community, or admin profile data
- **Marketplace Application:** Jury submission data and media URLs
- **Active Addons:** Subscribed website addons and features
- **Enhanced Media:** Processed image URLs for all profile media

**Response Structure:**
```json
{
  "id": 123,
  "username": "user@example.com",
  "user_type": "artist",
  "first_name": "John",
  "last_name": "Doe",
  "business_name": "John's Art Studio",
  "marketplace_application": {
    "work_description": "...",
    "media_urls": {
      "raw_materials": "https://api.beemeeart.com/api/images/...",
      "work_process_1": "https://api.beemeeart.com/api/images/..."
    }
  },
  "addons": [...],
  "addon_slugs": ["premium-gallery", "custom-domain"]
}
```

**Profile Type Handling:**
- **Artist:** Includes artist_profiles data (business info, art categories, studio details)
- **Community:** Includes community_profiles data (preferences, interests, wishlist)
- **Promoter:** Includes promoter_profiles data (organization info, event details)
- **Admin:** Includes all profile types for comprehensive access

### GET /users
**Purpose:** Filter users by permissions and user types

**Authentication:** Required - JWT token

**Query Parameters:**
- `permissions` (required): Comma-separated list of permissions/user types

**Supported Filters:**
- **User Types:** `admin` (filters by user_type)
- **Permissions:** `vendor`, `events`, `stripe_connect`, `manage_sites`, etc.

**Response Format:**
```json
[
  {
    "id": 123,
    "username": "user@example.com",
    "user_type": "artist",
    "first_name": "John",
    "last_name": "Doe",
    "display_name": "John Doe",
    "email": "user@example.com"
  }
]
```

**Use Cases:**
- Admin user selection dropdowns
- Permission-based user filtering
- Role-based access control lists

### PATCH /users/me
**Purpose:** Update current user's profile with multi-type support and file uploads

**Authentication:** Required - JWT token

**File Upload Support:**
- **Profile Images:** `profile_image`, `header_image`, `logo_image`, `site_image`
- **Jury Materials:** `jury_raw_materials`, `jury_work_process_1-3`, `jury_artist_at_work`, `jury_booth_display`
- **Video Materials:** `jury_artist_working_video`, `jury_artist_bio_video`, `jury_additional_video`

**Profile Types Supported:**
1. **Base Profile (user_profiles):**
   - Personal information, contact details, social media
   - Address information, bio, website
   - Education, awards, memberships, timezone

2. **Artist Profile (artist_profiles):**
   - Artist biography, art categories, mediums
   - Business information, tax details, studio address
   - Custom work capabilities, business social media

3. **Community Profile (community_profiles):**
   - Art style preferences, favorite colors
   - Art interests, wishlist items

4. **Promoter Profile (promoter_profiles):**
   - Organization details, non-profit status
   - Office address, sponsorship options
   - Upcoming events, business information

**Marketplace Application Handling:**
- Automatically creates/updates marketplace application
- Links uploaded jury materials to application
- Stores profile snapshot for jury review

**Dynamic Field Updates:**
- Only updates fields provided in request
- Preserves existing data for unprovided fields
- Validates required fields based on user type

### PATCH /users/admin/me
**Purpose:** Admin-specific profile update with access to all profile types

**Authentication:** Required - JWT token with admin role

**Admin Privileges:**
- Can update all profile types simultaneously
- Access to artist, promoter, and community profile fields
- Prefixed field names to avoid conflicts (e.g., `artist_business_name`, `promoter_business_name`)

**Field Prefixing:**
- `artist_*` - Artist profile fields
- `promoter_*` - Promoter profile fields
- Base fields remain unprefixed

### GET /users/profile/by-id/:id
**Purpose:** Fetch public profile by user ID

**Authentication:** None required (public endpoint)

**Access Control:**
- Only returns profiles for active users
- Public profile information only
- Enhanced with processed media URLs

**Profile Type Inclusion:**
- Includes type-specific profile data based on user type
- Artist profiles for artists and admins
- Community/promoter profiles for respective types

### GET /users/artists
**Purpose:** Fetch list of active artists with pagination

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `limit` (default: 20, max: 100): Number of results
- `offset` (default: 0): Results to skip for pagination
- `random` (default: 'true'): Randomize results or sort by creation date

**Artist Data Included:**
- Basic profile information
- Artist-specific data (business name, biography, location)
- Art categories and custom work capabilities
- Profile images and business website

**Use Cases:**
- Artist directory listings
- Featured artist displays
- Random artist discovery

### GET /users/:id/policies
**Purpose:** Get user's shipping and return policies

**Authentication:** None required (public endpoint)

**Policy Resolution:**
1. **Custom Policies:** User-specific policies if configured
2. **Default Policies:** System default policies as fallback
3. **Policy Source:** Indicates whether custom or default policy

**Response Structure:**
```json
{
  "success": true,
  "policies": {
    "shipping": {
      "id": 1,
      "policy_text": "...",
      "policy_source": "custom|default"
    },
    "return": {
      "id": 2,
      "policy_text": "...",
      "policy_source": "custom|default"
    }
  }
}
```

## Profile Management Endpoints

### GET /users/profile-completion-status
**Purpose:** Check if user's profile is complete for their user type

**Authentication:** Required - JWT token

**Validation Rules:**
- **Base Fields:** first_name, last_name, address_line1, city, state, postal_code, phone
- **Business Fields:** business_name (required for artists and promoters)

**Response Structure:**
```json
{
  "isComplete": false,
  "requiresCompletion": true,
  "missingFields": [
    {
      "field": "first_name",
      "label": "First Name"
    }
  ],
  "userType": "artist"
}
```

**Use Cases:**
- Profile completion workflows
- Onboarding progress tracking
- Feature access gating

### PATCH /users/complete-profile
**Purpose:** Update missing profile fields to complete user profile

**Authentication:** Required - JWT token

**Required Fields Validation:**
- Validates all required fields based on user type
- Returns specific field validation errors
- Updates both base profile and type-specific business name

**Database Updates:**
- `user_profiles` table for base information
- `artist_profiles` or `promoter_profiles` for business name

### POST /users/select-user-type
**Purpose:** Allow Draft users to select their user type

**Authentication:** Required - JWT token

**User Type Selection:**
- **Valid Types:** `artist`, `promoter`, `community`
- **One-Time Selection:** Can only be changed from `Draft` status
- **Profile Implications:** Determines available profile features and requirements

**Validation:**
- User must have `Draft` user type
- Selected type must be valid
- Updates `users.user_type` field

## Helper Functions

### getVendorShippingPolicy(vendorId)
**Purpose:** Retrieve vendor's shipping policy with default fallback

**Policy Resolution Logic:**
1. Check for custom vendor policy (`user_id = vendorId`)
2. Fall back to default policy (`user_id = NULL`)
3. Return null if no policies exist

**Database Queries:**
- Joins with `users` table for creator information
- Filters by `status = 'active'`
- Returns policy text, dates, and source type

### getVendorReturnPolicy(vendorId)
**Purpose:** Retrieve vendor's return policy with default fallback

**Identical Logic:** Same as shipping policy but for return policies table

## File Upload Handling

### Profile Images
- **Storage Location:** `/temp_images/profiles/`
- **Supported Types:** profile_image, header_image, logo_image
- **Processing:** Stored in `pending_images` table for processing
- **Database Updates:** Updates appropriate profile table with image path

### Site Images
- **Storage Location:** `/temp_images/sites/`
- **Purpose:** Site-specific branding images
- **Processing:** Same pending_images workflow

### Jury Materials
- **Storage Location:** `/temp_images/jury/`
- **Types:** Raw materials, work process steps, artist photos, videos
- **Marketplace Integration:** Links to marketplace_applications table
- **Media ID Tracking:** Stores pending_images IDs for each jury field

### File Processing Workflow
1. **Upload:** Files saved to temporary location
2. **Database Entry:** Record created in pending_images table
3. **Processing:** Background processing for optimization/validation
4. **URL Generation:** Processed URLs generated via mediaUtils
5. **Profile Update:** Image paths updated in appropriate profile tables

## Environment Variables
- `SMART_MEDIA_BASE_URL`: Base URL for processed media files (default: https://api.beemeeart.com/api/images)

## Security Considerations

### Authentication & Authorization
- **JWT Validation:** All protected endpoints require valid JWT tokens
- **User Type Validation:** Admin endpoints verify admin user type
- **Profile Ownership:** Users can only modify their own profiles
- **Public Data:** Public endpoints only expose safe, non-sensitive data

### File Upload Security
- **File Type Validation:** Multer configuration restricts file types
- **Size Limits:** Maximum file sizes enforced
- **Secure Naming:** Random filename generation prevents conflicts
- **Temporary Storage:** Files stored in temporary location before processing

### Data Validation
- **Input Sanitization:** All user inputs validated and sanitized
- **Required Field Validation:** Type-specific required field enforcement
- **Business Logic Validation:** Profile completion rules enforced
- **Database Constraints:** Foreign key relationships maintained

## Performance Considerations

### Database Optimization
- **Selective Updates:** Only updates provided fields to minimize database load
- **Efficient Queries:** Optimized JOIN queries for profile data retrieval
- **Index Usage:** Proper indexing on user_id and status fields
- **Connection Pooling:** Efficient database connection management

### File Handling
- **Async Processing:** File uploads processed asynchronously
- **Temporary Storage:** Efficient temporary file management
- **Media Enhancement:** Cached processed media URLs
- **Batch Operations:** Efficient bulk profile updates

### Query Optimization
- **Pagination:** Proper LIMIT/OFFSET for large result sets
- **Conditional Queries:** Dynamic query building for optional fields
- **Result Caching:** Enhanced media URLs cached for performance
- **Selective Fields:** Only fetch required profile data

## Error Handling

### Profile Errors
- **Missing User:** 404 for non-existent users
- **Invalid User Type:** 400 for invalid user type selections
- **Profile Completion:** Detailed validation errors for missing fields
- **Permission Errors:** 403 for insufficient permissions

### File Upload Errors
- **Upload Failures:** Proper error handling for file upload issues
- **Storage Errors:** Database transaction rollback on storage failures
- **Processing Errors:** Graceful handling of media processing failures
- **Size/Type Errors:** Clear validation messages for file restrictions

### Database Errors
- **Connection Failures:** Proper error logging and user feedback
- **Constraint Violations:** Handling of foreign key and unique constraints
- **Transaction Failures:** Proper rollback and error recovery
- **Query Errors:** Safe error messages without exposing database details

## Usage Examples

### Complete Profile Update
```javascript
const formData = new FormData();
formData.append('first_name', 'John');
formData.append('last_name', 'Doe');
formData.append('business_name', 'John\'s Art Studio');
formData.append('profile_image', fileInput.files[0]);

const response = await fetch('/users/me', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Check Profile Completion
```javascript
const response = await fetch('/users/profile-completion-status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { isComplete, missingFields } = await response.json();
```

### Filter Users by Permission
```javascript
const response = await fetch('/users?permissions=vendor,admin', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const users = await response.json();
```

### Marketplace Application with Jury Materials
```javascript
const formData = new FormData();
formData.append('work_description', 'Description of artistic work...');
formData.append('jury_raw_materials', rawMaterialsFile);
formData.append('jury_work_process_1', workProcessFile);

const response = await fetch('/users/me', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

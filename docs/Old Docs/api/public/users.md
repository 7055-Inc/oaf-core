# User Management API

## Overview
The Beemeeart User Management API provides comprehensive user profile management, including multi-type profiles (artist, promoter, community), file uploads, and profile completion workflows.

## Authentication
Most endpoints require authentication via JWT token in the Authorization header. Public endpoints are clearly marked.

## Base URL
```
https://api.beemeeart.com/users
```

## Endpoints

### Get Current User Profile
`GET /users/me`

Fetch the complete profile of the authenticated user, including type-specific data and marketplace applications.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "id": 123,
  "username": "artist@example.com",
  "user_type": "artist",
  "email_verified": "yes",
  "status": "active",
  "first_name": "Jane",
  "last_name": "Smith",
  "business_name": "Jane's Art Studio",
  "artist_biography": "Professional artist specializing in...",
  "art_categories": "[\"painting\", \"sculpture\"]",
  "marketplace_application": {
    "work_description": "My artistic process involves...",
    "marketplace_status": "pending",
    "media_urls": {
      "raw_materials": "https://api.beemeeart.com/api/images/...",
      "work_process_1": "https://api.beemeeart.com/api/images/..."
    }
  },
  "addons": [
    {
      "addon_slug": "premium-gallery",
      "addon_name": "Premium Gallery",
      "is_active": 1
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### Update User Profile
`PATCH /users/me`

Update the current user's profile with support for multiple profile types and file uploads.

**Authentication:** Required - Bearer token

**Content-Type:** `multipart/form-data` (for file uploads) or `application/json`

**Request Body (Form Data):**
```
# Base Profile Fields
first_name: "Jane"
last_name: "Smith"
bio: "Artist and designer"
phone: "+1-555-0123"
address_line1: "123 Art Street"
city: "Austin"
state: "TX"
postal_code: "78701"

# Artist Profile Fields (for artists)
artist_biography: "Professional artist with 10 years experience"
business_name: "Jane's Art Studio"
art_categories: ["painting", "sculpture"]
does_custom: "yes"

# File Uploads
profile_image: (file)
header_image: (file)
jury_raw_materials: (file)
jury_work_process_1: (file)
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "uploadedFiles": {
    "jury_raw_materials": 145,
    "jury_work_process_1": 146
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or validation errors
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Update failed

### Get User Profile by ID
`GET /users/profile/by-id/{id}`

Fetch a public user profile by user ID. Only returns active user profiles.

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path): User ID to fetch

**Response (200 OK):**
```json
{
  "id": 123,
  "username": "artist@example.com",
  "user_type": "artist",
  "first_name": "Jane",
  "last_name": "Smith",
  "business_name": "Jane's Art Studio",
  "artist_biography": "Professional artist...",
  "bio": "Artist and designer based in Austin"
}
```

**Error Responses:**
- `404 Not Found`: User not found or inactive
- `500 Internal Server Error`: Server error

### Get Artists List
`GET /users/artists`

Fetch a list of active artists with pagination and optional randomization.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `limit` (number, optional): Maximum results (default: 20, max: 100)
- `offset` (number, optional): Results to skip (default: 0)
- `random` (string, optional): Randomize results ('true'/'false', default: 'true')

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "username": "artist1@example.com",
    "user_type": "artist",
    "first_name": "Jane",
    "last_name": "Smith",
    "business_name": "Jane's Art Studio",
    "studio_city": "Austin",
    "studio_state": "TX",
    "art_categories": "[\"painting\", \"sculpture\"]",
    "does_custom": "yes"
  }
]
```

**Example Usage:**
```bash
# Get 10 random artists
curl "https://api.beemeeart.com/users/artists?limit=10&random=true"

# Get artists sorted by creation date with pagination
curl "https://api.beemeeart.com/users/artists?limit=20&offset=40&random=false"
```

### Get User Policies
`GET /users/{id}/policies`

Get a user's shipping and return policies. Returns custom policies or defaults.

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path): User ID to fetch policies for

**Response (200 OK):**
```json
{
  "success": true,
  "policies": {
    "shipping": {
      "id": 1,
      "policy_text": "Items ship within 3-5 business days...",
      "policy_source": "custom",
      "created_at": "2024-01-01T12:00:00Z"
    },
    "return": {
      "id": 2,
      "policy_text": "Returns accepted within 30 days...",
      "policy_source": "default",
      "created_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: User not found or inactive
- `500 Internal Server Error`: Server error

### Check Profile Completion Status
`GET /users/profile-completion-status`

Check if the authenticated user's profile is complete based on their user type.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "isComplete": false,
  "requiresCompletion": true,
  "missingFields": [
    {
      "field": "first_name",
      "label": "First Name"
    },
    {
      "field": "business_name",
      "label": "Business Name"
    }
  ],
  "userType": "artist"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### Complete Profile
`PATCH /users/complete-profile`

Update missing profile fields to complete the user's profile.

**Authentication:** Required - Bearer token

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "address_line1": "123 Art Street",
  "city": "Austin",
  "state": "TX",
  "postal_code": "78701",
  "phone": "+1-555-0123",
  "business_name": "Jane's Art Studio"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile completed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid required fields
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Update failed

### Select User Type
`POST /users/select-user-type`

Allow Draft users to select their user type (one-time selection).

**Authentication:** Required - Bearer token

**Request Body:**
```json
{
  "user_type": "artist"
}
```

**Valid User Types:**
- `artist` - Visual artists and creators
- `promoter` - Event organizers and promoters
- `community` - Art enthusiasts and collectors

**Response (200 OK):**
```json
{
  "message": "User type updated successfully",
  "user_type": "artist"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid user type or user type already selected
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Update failed

### Filter Users by Permissions
`GET /users`

Filter users by permissions and user types. Useful for admin interfaces.

**Authentication:** Required - Bearer token

**Query Parameters:**
- `permissions` (required): Comma-separated list of permissions/user types

**Supported Filters:**
- User types: `admin`
- Permissions: `vendor`, `events`, `stripe_connect`, `manage_sites`, etc.

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "username": "admin@example.com",
    "user_type": "admin",
    "first_name": "John",
    "last_name": "Admin",
    "display_name": "John Admin",
    "email": "admin@example.com"
  }
]
```

**Example Usage:**
```bash
# Get all vendors and admins
curl -H "Authorization: Bearer token" \
  "https://api.beemeeart.com/users?permissions=vendor,admin"
```

## Profile Types

### Artist Profile
Artists have access to comprehensive business and artistic profile features:

**Additional Fields:**
- `artist_biography` - Professional biography
- `art_categories` - Array of art categories/styles
- `art_mediums` - Array of artistic mediums used
- `business_name` - Business/studio name
- `does_custom` - Whether they accept custom work
- `studio_address` - Studio location details
- `business_social_*` - Business social media accounts

**Required for Completion:**
- Basic profile fields + `business_name`

### Promoter Profile
Event promoters and organizations:

**Additional Fields:**
- `business_name` - Organization name
- `is_non_profit` - Non-profit organization status
- `organization_size` - Size of organization
- `office_address` - Office location details
- `sponsorship_options` - Available sponsorship opportunities
- `upcoming_events` - Information about upcoming events

**Required for Completion:**
- Basic profile fields + `business_name`

### Community Profile
Art enthusiasts and collectors:

**Additional Fields:**
- `art_style_preferences` - Preferred art styles
- `favorite_colors` - Color preferences
- `art_interests` - Areas of artistic interest
- `wishlist` - Wishlist items and preferences

**Required for Completion:**
- Basic profile fields only

## File Upload Support

### Supported File Types
- **Images:** JPEG, PNG, GIF, WebP
- **Videos:** MP4, WebM, MOV (for jury materials)

### Upload Fields

#### Profile Images
- `profile_image` - User profile photo
- `header_image` - Profile header/banner image
- `logo_image` - Business/studio logo
- `site_image` - Site-specific branding image

#### Jury Materials (for marketplace applications)
- `jury_raw_materials` - Raw materials photo
- `jury_work_process_1` - Work process step 1
- `jury_work_process_2` - Work process step 2
- `jury_work_process_3` - Work process step 3
- `jury_artist_at_work` - Artist working photo
- `jury_booth_display` - Booth/display setup photo
- `jury_artist_working_video` - Artist working video
- `jury_artist_bio_video` - Artist biography video
- `jury_additional_video` - Additional video material

### File Processing
1. Files are uploaded to temporary storage
2. Database records created for tracking
3. Background processing optimizes files
4. Processed URLs provided in profile responses

## Rate Limits
- **Profile updates:** 10 requests per minute per user
- **Profile fetching:** 100 requests per minute per IP
- **File uploads:** 5 uploads per minute per user

## Error Handling

### Standard Error Format
```json
{
  "error": "Error description",
  "field": "field_name"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `413` - Payload Too Large (file size exceeded)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server error)

## Integration Examples

### Complete Profile Update with Files
```javascript
const formData = new FormData();
formData.append('first_name', 'Jane');
formData.append('last_name', 'Smith');
formData.append('business_name', 'Jane\'s Art Studio');
formData.append('artist_biography', 'Professional artist...');
formData.append('profile_image', profileImageFile);
formData.append('jury_raw_materials', juryFile);

const response = await fetch('/users/me', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
```

### Profile Completion Workflow
```javascript
// Check completion status
const statusResponse = await fetch('/users/profile-completion-status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { isComplete, missingFields } = await statusResponse.json();

if (!isComplete) {
  // Show completion form with missing fields
  const completionData = {
    first_name: 'Jane',
    last_name: 'Smith',
    // ... other required fields
  };
  
  const completeResponse = await fetch('/users/complete-profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(completionData)
  });
}
```

### Artist Directory Integration
```javascript
// Fetch random artists for homepage
const artistsResponse = await fetch('/users/artists?limit=6&random=true');
const featuredArtists = await artistsResponse.json();

// Paginated artist directory
const directoryResponse = await fetch(
  `/users/artists?limit=20&offset=${page * 20}&random=false`
);
const artistDirectory = await directoryResponse.json();
```

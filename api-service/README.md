# Online Art Festival API

## Overview

The Online Art Festival API is designed to facilitate interactions within the Online Art Festival platform, focusing currently on user management and profile setup. This API adheres to RESTful principles, ensuring intuitive and predictable endpoints for CRUD operations. Authentication is managed via Google ID Platform/Firebase, with the API validating Firebase ID Tokens (stored as `google_uid` in the `users` table) for session persistence and access control.

## API Architecture

The API follows a multi-tier design:
- **Client Layer**: End-user interactions through web or mobile applications.
- **API Gateway**: Manages routing, authentication, and rate limiting.
- **Application Layer**: Handles business logic and data processing.
- **Data Layer**: Manages interactions with the MySQL database.

This structure ensures scalability and maintainability, with the current implementation prioritizing user-related data management.

## API Standards

### URL Structure
- Base path: `/api/v1`
- Resource-oriented: `/resource/{identifier}`
- Sub-resources: `/resource/{identifier}/sub-resource`

### HTTP Methods
- `GET`: Retrieve data
- `POST`: Create new data
- `PUT`: Update existing data
- `DELETE`: Remove data

### Request Format
- Content-Type: `application/json`
- Authentication: Bearer Token in `Authorization` header

### Response Format
- Success: `{ success: true, data: { ... } }`
- Error: `{ error: "message", details: { ... } }`
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 500)

### Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Database Fields

The following tables and fields are currently in focus for the API:

### Core User Data
- **Table**: `users`
  - `id`: Auto-incrementing primary key (read-only)
  - `google_uid`: Unique identifier from Google/Firebase (read-only)
  - `username`: User's email or chosen identifier (editable)
  - `email_verified`: Boolean indicating email verification status (editable)
  - `user_type`: Enum (`user`, `artist`, `promoter`, `community`, `admin`) (editable)
  - `status`: Enum (`active`, `inactive`, `suspended`) (editable)
  - `created_at`: Timestamp of creation (read-only)
  - `updated_at`: Timestamp of last update (read-only)
  - `last_login`: Timestamp of last login (read-only)
  - `onboarding_completed`: Boolean indicating onboarding status (editable)

### User Profiles
- **Table**: `user_profiles`
  - `user_id`: Foreign key to `users.id` (read-only)
  - `first_name`, `last_name`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`: Basic contact and address information (editable)
  - `profile_image_path`, `header_image_path`, `display_name`, `website`: Profile customization fields (editable)
  - `social_facebook`, `social_instagram`, `social_tiktok`, `social_twitter`, `social_pinterest`, `social_whatsapp`: Social media links (editable)
  - `birth_date`, `gender`, `nationality`, `languages_known`, `job_title`, `bio`, `education`, `awards`, `memberships`, `follows`, `timezone`, `preferred_currency`, `profile_visibility`: Detailed personal information (editable)
  - `created_at`, `updated_at`: Timestamps (read-only)

### Type-Specific Profiles
- **Table**: `admin_profiles`
  - `user_id`: Foreign key to `users.id` (read-only)
  - `title`: Job title or role (editable)
  - `created_at`, `updated_at`: Timestamps (read-only)

- **Table**: `artist_profiles`
  - `user_id`: Foreign key to `users.id` (read-only)
  - `art_categories`, `art_mediums`, `business_name`, `studio_address_line1`, `studio_address_line2`, `studio_city`, `studio_state`, `studio_zip`, `artist_biography`, `business_phone`, `business_website`, `business_social_facebook`, `business_social_instagram`, `business_social_tiktok`, `business_social_twitter`, `business_social_pinterest`, `does_custom`, `customer_service_email`, `legal_name`, `tax_id`, `founding_date`, `business_size`, `business_hours`, `price_range`, `payment_methods`, `service_area`, `logo_path`, `slogan`, `art_forms`, `art_style`, `art_genres`, `teaching_credentials`, `exhibitions`, `collections`, `commission_status`, `publications`: Artist-specific fields (editable)
  - `created_at`, `updated_at`: Timestamps (read-only)

- **Table**: `promoter_profiles`
  - `user_id`: Foreign key to `users.id` (read-only)
  - `business_name`, `business_phone`, `business_website`, `business_social_facebook`, `business_social_instagram`, `business_social_tiktok`, `business_social_twitter`, `business_social_pinterest`, `office_address_line1`, `office_address_line2`, `office_city`, `office_state`, `office_zip`, `is_non_profit`, `artwork_description`, `legal_name`, `tax_id`, `founding_date`, `organization_size`, `business_hours`, `logo_path`, `slogan`, `event_types`, `venue_partnerships`, `past_events`, `upcoming_events`, `specialties`, `sponsorship_options`, `typical_audience_size`: Promoter-specific fields (editable)
  - `created_at`, `updated_at`: Timestamps (read-only)

- **Table**: `community_profiles`
  - `user_id`: Foreign key to `users.id` (read-only)
  - `art_style_preferences`, `favorite_colors`, `art_interests`, `collecting_preferences`, `event_preferences`, `followings`, `wishlist`, `collection`: Community member preferences and interests (editable)
  - `created_at`, `updated_at`: Timestamps (read-only)

**Note**: Other tables (e.g., `products`, `carts`, `orders`) exist in the database schema but are not currently exposed via the API. They will be documented and integrated in future phases.

## Additional Notes

- **Current Scope**: The API currently supports full CRUD operations for user-related data as outlined in the `API-Specs.md`. This focus ensures a robust foundation for user management before expanding to other areas.
- **Security**: All endpoints require authentication, and users can only access or modify their own data. Additional checks ensure type-specific profiles match the user's `user_type`.
- **Testing**: A test dashboard is available at `/dashboard.html` for interacting with user-related endpoints. It is permanently tied to a dummy user for testing CRUD operations, simplifying the process without requiring authentication.

For detailed endpoint specifications, refer to `API-Specs.md`.
# Database Documentation

This directory contains documentation related to the OAF database schema and structure.

## Files

- `schema.sql`: Current database schema containing all table definitions
- `DB-TODO.md`: List of pending database tasks and improvements

## Database Overview

The OAF database consists of several key components:

### User Management
- `users`: Core user table with basic identity information
- `user_profiles`: Extended user profile information
- Various specialized profiles: `admin_profiles`, `artist_profiles`, `community_profiles`, `promoter_profiles`

### E-Commerce System
- `products`: Core product information
- `product_images`: Image associations for products
- `product_categories`: Category relationships for products
- `product_shipping`: Shipping information for products
- `variant_kinds`: Product variant definitions
- `vendor_shipping_methods`: Shipping methods available from vendors
- `vendor_sku_log`: Log of vendor SKU information

### Shopping System
- `carts`: Shopping carts
- `cart_items`: Items in shopping carts
- `cart_applied_coupons`: Coupons applied to carts
- `coupons`: Available coupon definitions
- `sales`: Sales records

### Media
- `media_library`: Media assets library

### Categorization
- `categories`: General category system

## Database Connection

Database connection details:
- Host: 10.128.0.31
- User: oafuser
- Database: oaf

## Authentication & Registration Related Tables

Note: The authentication and session management system has been partially refactored. The following tables are relevant to the current `api-service` implementation:

**Actively Used by `api-service`:**
- `sessions`: Used by `express-mysql-session` for managing user login sessions (configured in `api-service/src/server.js`).
- `user_checklist`: Updated by the `/registration/complete` endpoint.

**Referenced or Potentially Used:**
- `users`: Core user table, used by most user/profile/registration endpoints.
- `user_profiles`: Used by `/registration/save-field` and `/user/profile`.
- `artist_profiles`, `community_profiles`, `promoter_profiles`: Used by `/registration/save-field` based on `user_type`.

**Likely Unused/Deprecated by `api-service` (Verify based on other services/codebases):**
- `saved_registrations`: The draft system does not appear to be implemented in the current `api-service/src/routes/index.js`.
- `permissions`: Not directly referenced in `api-service/src/routes/index.js` routes.
- `permissions_log`: Not directly referenced in `api-service/src/routes/index.js` routes.
- `email_verification_tokens`: No email verification routes found in `api-service/src/routes/index.js`.
- `admin_profiles`: Exists in schema, potentially used by `/users/:uid/check-user` if `userType` is admin, but general profile endpoints don't handle it.
- `password_reset_tokens`, `terms_acceptances`, `terms_versions`: No related functionality found in `api-service/src/routes/index.js`.

The primary authentication mechanism relies on Firebase Auth token verification. 
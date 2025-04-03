# Database Schema Inventory

## Overview

This document provides a comprehensive analysis of the current database structure for the Online Art Festival application. It serves as the foundation for our API standardization process, following our database-first approach.

## Core Entities

### User Management

#### Users Table
- **Table:** `users`
- **Primary Key:** `id` (bigint, auto_increment)
- **Core Fields:**
  - `username` (varchar(255))
  - `password` (varchar(255)) - Nullable for Google auth users
  - `email_verified` (enum: 'yes'/'no', default 'no')
  - `user_type` (enum: 'artist'/'promoter'/'community'/'admin')
  - `status` (enum: 'active'/'inactive'/'suspended', default 'active')
  - `google_uid` (varchar(128)) - For Google Identity Platform authentication
- **Timestamps:**
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `last_login` (timestamp)

#### User Profiles
The system employs a polymorphic profile structure with a base `user_profiles` table and type-specific tables:

- **Base Profile Table:** `user_profiles`
- **Type-Specific Tables:**
  - `artist_profiles`
  - `promoter_profiles`
  - `community_profiles`
  - `admin_profiles`
- **Relationship:** One-to-one with `users` table via `user_id` foreign key

#### Authentication Tables
- `email_verification_tokens` - Tracks email verification process
- `password_reset_tokens` - Manages password reset functionality
- `sessions` - Stores user session data

#### Authorization
- `permissions` - User permission flags
- `permissions_log` - Audit trail for permission changes

### Product Management

#### Products Table
- **Table:** `products`
- **Primary Key:** `id` (bigint, auto_increment)
- **Core Fields:**
  - `name` (varchar(100), default 'Artwork')
  - `price` (decimal(10,2), default 0.00)
  - `vendor_id` (bigint) - References users(id)
  - `description` (text)
  - `short_description` (text)
  - `available_qty` (int, default 10)
  - `category_id` (bigint, default 1)
  - `sku` (varchar(50), default 'SKU-DEFAULT')
  - `status` (enum: 'draft'/'active'/'deleted'/'hidden', default 'draft')
  - Product dimensions and weight fields
- **Parent-Child Relationship:** Self-referencing via `parent_id` for variants
- **Timestamps:**
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `created_by` (bigint) - References users(id)
  - `updated_by` (bigint) - References users(id)

#### Related Product Tables
- `product_images` - Product images
- `product_categories` - Many-to-many relationship with categories
- `product_shipping` - Shipping information for products
- `variant_kinds` - Product variant types
- `vendor_sku_log` - SKU tracking
- `categories` - Product categorization, supports hierarchy via `parent_id`

### Shopping Experience

#### Cart System
- **Main Tables:**
  - `carts` - Shopping cart management
  - `cart_items` - Items in carts
  - `cart_applied_coupons` - Coupons applied to carts
- **Supporting Tables:**
  - `coupons` - Available discounts
  - `sales` - Product sales records
  - `vendor_shipping_methods` - Shipping options by vendor

### Media Management
- `media_library` - Central repository for media files

### Registration Management
- `saved_registrations` - Stores in-progress registration data

## Database Relationships

### One-to-One Relationships
- Users have exactly one profile of each applicable type
- Users have one set of permissions

### One-to-Many Relationships
- Users can create many products
- Products can have many images
- Users can have many carts
- Carts can have many items
- Products can have many variants (parent-child)

### Many-to-Many Relationships
- Products to Categories (via `product_categories`)
- Users (vendors) to Products (via `vendor_sku_log`)

## Inconsistencies & Issues

### Schema vs Documentation Inconsistencies

1. **Field Type Discrepancies:**
   - The `email_verification_tokens.user_id` is defined as varchar(128) in the schema but documented as referencing users(id) which is bigint
   - The schema shows `email_verification_tokens` foreign key references `users.google_uid` not `users.id`

2. **Missing Fields in Documentation:**
   - `products.short_description` exists in schema but is not fully documented
   - `product_shipping` has fields like `shipping_type` and `shipping_services` with inconsistent documentation

3. **Status Field Inconsistencies:**
   - `carts.status` has many more values in schema than documented (draft/abandoned/expired/processing/error/paid/accepted/shipped/cancelled/refunded)
   - Some status fields lack proper documentation for all possible values

4. **JSON Fields Implementation:**
   - JSON fields like `art_categories` and `art_mediums` in `artist_profiles` lack schema definition for their structure
   - No validation guidelines for JSON content

### Database Design Issues

1. **Foreign Key Integrity:**
   - `email_verification_tokens.user_id` references `users.google_uid` not `users.id`, creating a non-standard relationship pattern
   - Some tables missing ON DELETE and ON UPDATE behavior definitions

2. **Enum Consistency:**
   - Inconsistent use of 'yes'/'no' vs. boolean fields for similar concepts
   - Status enums sometimes have inconsistent naming patterns

3. **Authorization Model:**
   - The `permissions` table uses multiple yes/no fields rather than a role-based approach
   - No clear separation between authentication and authorization

4. **Timestamp Consistency:**
   - Some tables use `uploaded_at` instead of `created_at`
   - Inconsistent use of `DEFAULT_GENERATED` with timestamps

## Recommendations for Improvement

### Required for API Standardization

1. **User Authentication Enhancement:**
   - Standardize the relationship between `users` and `email_verification_tokens`
   - Add email field directly to `users` table for consistency with Google Identity Platform
   - Consider adding a refresh token field for authentication management

2. **Profile Data Structure:**
   - Consider adding validation for JSON fields like `art_categories` and `art_mediums`
   - Document expected structure for all JSON fields to support API validation

3. **Enhanced Registration Management:**
   - Review `saved_registrations` table to ensure it supports multi-step registration
   - Consider adding status tracking fields for registration progress
   - Add explicit relationship to users table where applicable

4. **Shopping Cart API Support:**
   - Add guest cart conversion functionality
   - Ensure cart session management is properly supported
   - Review cart status workflow for API state management

5. **Authorization Improvements:**
   - Consider implementing a more flexible role-based permission system
   - Add fine-grained access control fields to support API authorization

### Optional Enhancements

1. **Audit Logging:**
   - Expand `permissions_log` pattern to other entities
   - Add comprehensive change tracking

2. **Internationalization Support:**
   - Add language preference fields to user profiles
   - Consider structure for multilingual content

3. **Enhanced Media Management:**
   - Improve media organization capabilities
   - Add media collection functionality

4. **API-Specific Fields:**
   - Add API version tracking for entities
   - Consider adding API-specific metadata fields

## Next Steps

1. Review this inventory with the team
2. Prioritize database structure enhancements
3. Implement critical changes needed for API standardization
4. Document updated schema for API development
5. Develop database access patterns based on API needs 
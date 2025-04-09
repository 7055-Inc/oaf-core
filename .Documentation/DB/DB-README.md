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

## Authentication

Note: The previous authentication tables have been removed as part of the migration to a new authentication system. The following tables were removed:

- `email_verification_tokens`
- `user_requirement_status`
- `login_checklist_requirements`
- `login_checklist_logs`
- `password_reset_tokens`
- `permissions`
- `permissions_log`
- `terms_acceptances`
- `terms_versions`
- `saved_registrations`
- `sessions`

A new authentication and session management system will be implemented. 
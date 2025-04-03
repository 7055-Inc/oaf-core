# Database Relationships

This document describes the relationships between tables in the OAF database.

## One-to-One Relationships

### User Profile Relationships
- `users` → `user_profiles` (user_id)
- `users` → `artist_profiles` (user_id)
- `users` → `promoter_profiles` (user_id)
- `users` → `community_profiles` (user_id)
- `users` → `admin_profiles` (user_id)

### Authentication Relationships
- `users` → `email_verification_tokens` (user_id)
- `users` → `password_reset_tokens` (user_id)
- `users` → `sessions` (user_id)

## One-to-Many Relationships

### Product Management
- `users` → `products` (vendor_id)
- `users` → `products` (created_by)
- `users` → `products` (updated_by)
- `products` → `products` (parent_id for variants)
- `products` → `product_images` (product_id)
- `products` → `product_shipping` (product_id)
- `products` → `sales` (product_id)
- `categories` → `categories` (parent_id)
- `categories` → `products` (category_id)
- `users` → `variant_kinds` (user_id)
- `users` → `vendor_shipping_methods` (vendor_id)

### Shopping Experience
- `users` → `carts` (user_id)
- `carts` → `cart_items` (cart_id)
- `products` → `cart_items` (product_id)
- `users` → `cart_items` (vendor_id)
- `carts` → `cart_applied_coupons` (cart_id)
- `coupons` → `cart_applied_coupons` (coupon_id)
- `users` → `coupons` (vendor_id)

### Media Management
- `users` → `media_library` (user_id)

### System Management
- `users` → `permissions_log` (user_id)
- `users` → `permissions_log` (created_by)
- `permissions` → `permissions_log` (permission_id)

## Many-to-Many Relationships

### Product Categories
- `products` ↔ `categories` through `product_categories`
  - `product_categories.product_id` → `products.id`
  - `product_categories.category_id` → `categories.id`

### Vendor SKU Management
- `users` ↔ `products` through `vendor_sku_log`
  - `vendor_sku_log.vendor_id` → `users.id`
  - `vendor_sku_log.product_id` → `products.id`

## Indexes

### Primary Indexes
All tables have a primary key index on their `id` column.

### Foreign Key Indexes
- `idx_artist_profiles_business` on `artist_profiles(business_name)`
- `idx_promoter_profiles_business` on `promoter_profiles(business_name)`
- `idx_user_profiles_name` on `user_profiles(display_name)`
- `idx_google_uid` on `users(google_uid)`
- `idx_username` on `users(username)`
- `idx_file_type` on `media_library(file_type)`
- `idx_status` on `media_library(status)`
- `idx_user_id` on `media_library(user_id)`
- `idx_cart_items_cart_id` on `cart_items(cart_id)`
- `idx_cart_items_product_id` on `cart_items(product_id)`
- `idx_cart_items_saved` on `cart_items(saved)`
- `idx_cart_items_vendor_id` on `cart_items(vendor_id)`
- `idx_carts_expires_at` on `carts(expires_at)`
- `idx_carts_guest_token` on `carts(guest_token)`
- `idx_carts_status` on `carts(status)`
- `idx_carts_user_id` on `carts(user_id)`
- `idx_vendor_shipping_default` on `vendor_shipping_methods(is_default)`
- `idx_vendor_shipping_vendor_id` on `vendor_shipping_methods(vendor_id)`

### Unique Indexes
- `uk_categories_name` on `categories(name)`
- `uk_products_sku` on `products(sku)`
- `vendor_sku_unique` on `products(vendor_id, sku)`
- `uk_ps_product_package` on `product_shipping(product_id, package_number)`
- `token` on `saved_registrations(token)`
- `token` on `email_verification_tokens(token)`
- `token` on `password_reset_tokens(token)`
- `code` on `coupons(code)`
- `vendor_sku_unique` on `vendor_sku_log(vendor_id, sku)`

## Last Updated
Generated from database on: $(date) 
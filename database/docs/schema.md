# OAF Database Schema

This document provides a comprehensive reference of the database schema used in the Online Art Festival application.

## Tables Overview

The OAF database consists of the following tables:

### User Management
- `users` - Core user information
- `user_profiles` - Extended user profile information
- `admin_profiles` - Administrator-specific information
- `artist_profiles` - Artist-specific information
- `promoter_profiles` - Promoter-specific information
- `community_profiles` - Community member information
- `permissions` - User permissions
- `permissions_log` - Permission change history

### Authentication & Security
- `email_verification_tokens` - Email verification management
- `password_reset_tokens` - Password reset functionality
- `sessions` - User session management

### Product Management
- `products` - Product information
- `product_categories` - Product-category relationships
- `product_images` - Product images
- `product_shipping` - Product shipping information
- `categories` - Product categories
- `variant_kinds` - Product variant types
- `vendor_sku_log` - SKU management
- `vendor_shipping_methods` - Vendor shipping options

### Shopping Experience
- `carts` - Shopping carts
- `cart_items` - Items in shopping carts
- `cart_applied_coupons` - Coupons applied to carts
- `coupons` - Available coupons
- `sales` - Sales records

### Media Management
- `media_library` - Media file management

### System Management
- `saved_registrations` - Registration process state

## Detailed Table Specifications

### users
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `username` (varchar(255)) NOT NULL UNIQUE
- `password` (varchar(255)) - Can be NULL for Google auth users
- `email_verified` (enum) - Values: 'yes', 'no', DEFAULT 'no'
- `user_type` (enum) - Values: 'artist', 'promoter', 'community', 'admin'
- `status` (enum) - Values: 'active', 'inactive', 'suspended', DEFAULT 'active'
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `last_login` (timestamp)
- `google_uid` (varchar(128)) - For Google authentication

### user_profiles
- `user_id` (bigint) PRIMARY KEY - References users(id)
- `first_name` (varchar(100))
- `last_name` (varchar(100))
- `display_name` (varchar(100))
- `phone` (varchar(50))
- `address_line1` (varchar(255))
- `address_line2` (varchar(255))
- `city` (varchar(100))
- `state` (varchar(100))
- `postal_code` (varchar(20))
- `country` (varchar(100))
- `profile_image_path` (varchar(255))
- `header_image_path` (varchar(255))
- `website` (varchar(255))
- `social_facebook` (varchar(255))
- `social_instagram` (varchar(255))
- `social_tiktok` (varchar(255))
- `social_twitter` (varchar(255))
- `social_pinterest` (varchar(255))
- `social_whatsapp` (varchar(255))
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### artist_profiles
- `user_id` (bigint) PRIMARY KEY - References users(id)
- `art_categories` (json)
- `art_mediums` (json)
- `business_name` (varchar(255))
- `studio_address_line1` (varchar(255))
- `studio_address_line2` (varchar(255))
- `studio_city` (varchar(100))
- `studio_state` (varchar(100))
- `studio_zip` (varchar(20))
- `artist_biography` (text)
- `business_phone` (varchar(50))
- `business_website` (varchar(255))
- `business_social_facebook` (varchar(255))
- `business_social_instagram` (varchar(255))
- `business_social_tiktok` (varchar(255))
- `business_social_twitter` (varchar(255))
- `business_social_pinterest` (varchar(255))
- `does_custom` (enum) - Values: 'yes', 'no', DEFAULT 'no'
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `customer_service_email` (varchar(255))

### promoter_profiles
- `user_id` (bigint) PRIMARY KEY - References users(id)
- `business_name` (varchar(255))
- `business_phone` (varchar(50))
- `business_website` (varchar(255))
- `business_social_facebook` (varchar(255))
- `business_social_instagram` (varchar(255))
- `business_social_tiktok` (varchar(255))
- `business_social_twitter` (varchar(255))
- `business_social_pinterest` (varchar(255))
- `office_address_line1` (varchar(255))
- `office_address_line2` (varchar(255))
- `office_city` (varchar(100))
- `office_state` (varchar(100))
- `office_zip` (varchar(20))
- `is_non_profit` (enum) - Values: 'yes', 'no', DEFAULT 'no'
- `artwork_description` (text)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### community_profiles
- `user_id` (bigint) PRIMARY KEY - References users(id)
- `art_style_preferences` (json)
- `favorite_colors` (json)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### products
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `name` (varchar(100)) NOT NULL DEFAULT 'Artwork'
- `description` (text)
- `price` (decimal(10,2)) NOT NULL DEFAULT '0.00'
- `sale_price` (decimal(10,2))
- `available_qty` (int) NOT NULL DEFAULT '10'
- `sku` (varchar(50)) NOT NULL DEFAULT 'SKU-DEFAULT', UNIQUE KEY
- `vendor_id` (bigint) NOT NULL - References users(id)
- `category_id` (bigint) NOT NULL DEFAULT '1' - References categories(id)
- `status` (enum) - Values: 'draft', 'active', 'deleted', 'hidden' DEFAULT 'draft'
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `created_by` (bigint) NOT NULL - References users(id)
- `updated_by` (bigint) - References users(id)
- `width` (decimal(10,2))
- `height` (decimal(10,2))
- `depth` (decimal(10,2))
- `weight` (decimal(10,2))
- `dimension_unit` (enum) - Values: 'in', 'cm'
- `weight_unit` (enum) - Values: 'lbs', 'kg'
- `parent_id` (bigint) - References products(id) for variants
- `product_type` (varchar(20))

### categories
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `name` (varchar(100)) NOT NULL
- `description` (text)
- `parent_id` (bigint) - References categories(id)
- `image` (varchar(255))
- `display_order` (int)
- `status` (enum) - Values: 'active', 'inactive'

### product_categories
- `product_id` (bigint) - References products(id)
- `category_id` (bigint) - References categories(id)
- PRIMARY KEY (product_id, category_id)

### product_images
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `product_id` (bigint) - References products(id)
- `image_path` (varchar(255)) NOT NULL
- `alt_text` (varchar(255))
- `friendly_name` (varchar(100))
- `is_primary` (boolean) DEFAULT false
- `display_order` (int)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

### product_shipping
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `product_id` (bigint) - References products(id)
- `package_number` (int) DEFAULT 1
- `ship_method` (enum) - Values: 'flat_rate', 'calculated', 'free'
- `ship_rate` (decimal(10,2))
- `shipping_type` (varchar(50))
- `length` (decimal(10,2))
- `width` (decimal(10,2))
- `height` (decimal(10,2))
- `weight` (decimal(10,2))
- `dimension_unit` (enum) - Values: 'in', 'cm'
- `weight_unit` (enum) - Values: 'lbs', 'kg'
- `shipping_services` (json)

### carts
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `user_id` (bigint) - References users(id)
- `guest_token` (varchar(100))
- `status` (enum) - Values: 'active', 'abandoned', 'converted'
- `expires_at` (timestamp)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### cart_items
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `cart_id` (bigint) - References carts(id)
- `product_id` (bigint) - References products(id)
- `quantity` (int) NOT NULL
- `price` (decimal(10,2)) NOT NULL
- `saved` (boolean) DEFAULT false
- `vendor_id` (bigint) - References users(id)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### coupons
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `code` (varchar(50)) NOT NULL UNIQUE
- `description` (text)
- `discount_type` (enum) - Values: 'percentage', 'fixed'
- `discount_amount` (decimal(10,2)) NOT NULL
- `min_purchase` (decimal(10,2))
- `max_discount` (decimal(10,2))
- `valid_from` (timestamp)
- `valid_until` (timestamp)
- `usage_limit` (int)
- `used_count` (int) DEFAULT 0
- `vendor_id` (bigint) - References users(id)
- `vendor_specific` (boolean) DEFAULT false
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### cart_applied_coupons
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `cart_id` (bigint) - References carts(id)
- `coupon_id` (bigint) - References coupons(id)
- `discount_amount` (decimal(10,2)) NOT NULL
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

### sales
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `product_id` (bigint) - References products(id)
- `quantity` (int) NOT NULL
- `price` (decimal(10,2)) NOT NULL
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

### media_library
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `user_id` (bigint) - References users(id)
- `file_path` (varchar(255)) NOT NULL
- `file_type` (enum) - Values: 'image', 'video', 'document', 'audio'
- `mime_type` (varchar(100))
- `original_filename` (varchar(255))
- `size_bytes` (int)
- `width` (int)
- `height` (int)
- `title` (varchar(255))
- `description` (text)
- `uploaded_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `status` (enum) - Values: 'active', 'archived', 'deleted'

### saved_registrations
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `token` (varchar(64)) NOT NULL UNIQUE
- `data` (text) NOT NULL
- `expires_at` (timestamp) NOT NULL
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

### sessions
- `id` (varchar(255)) PRIMARY KEY
- `user_id` (bigint) - References users(id)
- `ip_address` (varchar(45))
- `user_agent` (text)
- `payload` (text)
- `last_activity` (int)

### permissions
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `name` (varchar(100)) NOT NULL UNIQUE
- `description` (text)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `created_by` (bigint) - References users(id)

### permissions_log
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `permission_id` (bigint) - References permissions(id)
- `user_id` (bigint) - References users(id)
- `action` (enum) - Values: 'granted', 'revoked'
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `created_by` (bigint) - References users(id)

### email_verification_tokens
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `user_id` (bigint) - References users(id)
- `token` (varchar(100)) NOT NULL UNIQUE
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `expires_at` (timestamp) NOT NULL

### password_reset_tokens
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `user_id` (bigint) - References users(id)
- `token` (varchar(100)) NOT NULL UNIQUE
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `expires_at` (timestamp) NOT NULL

### variant_kinds
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `name` (varchar(50)) NOT NULL
- `user_id` (bigint) - References users(id)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

### vendor_shipping_methods
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `vendor_id` (bigint) - References users(id)
- `name` (varchar(100)) NOT NULL
- `description` (text)
- `is_default` (boolean) DEFAULT false
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP
- `updated_at` (timestamp) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### vendor_sku_log
- `id` (bigint) PRIMARY KEY AUTO_INCREMENT
- `vendor_id` (bigint) NOT NULL - References users(id)
- `sku` (varchar(50)) NOT NULL
- `product_id` (bigint) NULL - References products(id)
- `created_at` (timestamp) DEFAULT CURRENT_TIMESTAMP

## Last Updated
Generated from database on: $(date) 
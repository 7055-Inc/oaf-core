
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `admin_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_profiles` (
  `user_id` bigint NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `api_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_test` (
  `id` int NOT NULL AUTO_INCREMENT,
  `is_active` tinyint(1) DEFAULT '1',
  `message` varchar(255) DEFAULT 'Hello World',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `artist_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_profiles` (
  `user_id` bigint NOT NULL,
  `art_categories` json DEFAULT NULL,
  `art_mediums` json DEFAULT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `studio_address_line1` varchar(255) DEFAULT NULL,
  `studio_address_line2` varchar(255) DEFAULT NULL,
  `studio_city` varchar(100) DEFAULT NULL,
  `studio_state` varchar(100) DEFAULT NULL,
  `studio_zip` varchar(20) DEFAULT NULL,
  `artist_biography` text,
  `business_phone` varchar(50) DEFAULT NULL,
  `business_website` varchar(255) DEFAULT NULL,
  `business_social_facebook` varchar(255) DEFAULT NULL,
  `business_social_instagram` varchar(255) DEFAULT NULL,
  `business_social_tiktok` varchar(255) DEFAULT NULL,
  `business_social_twitter` varchar(255) DEFAULT NULL,
  `business_social_pinterest` varchar(255) DEFAULT NULL,
  `does_custom` enum('yes','no') DEFAULT 'no',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `customer_service_email` varchar(255) DEFAULT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `founding_date` date DEFAULT NULL,
  `business_size` varchar(50) DEFAULT NULL,
  `business_hours` json DEFAULT NULL,
  `price_range` varchar(100) DEFAULT NULL,
  `payment_methods` json DEFAULT NULL,
  `service_area` json DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `art_forms` json DEFAULT NULL,
  `art_style` varchar(255) DEFAULT NULL,
  `art_genres` json DEFAULT NULL,
  `teaching_credentials` json DEFAULT NULL,
  `exhibitions` json DEFAULT NULL,
  `collections` json DEFAULT NULL,
  `commission_status` enum('open','closed','waitlist') DEFAULT 'closed',
  `publications` json DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_artist_profiles_business` (`business_name`),
  CONSTRAINT `artist_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cart_applied_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_applied_coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cart_id` int NOT NULL,
  `coupon_id` int NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `discount_amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cart_id` (`cart_id`,`coupon_id`),
  KEY `fk_cart_applied_coupons_coupon_id` (`coupon_id`),
  CONSTRAINT `fk_cart_applied_coupons_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_applied_coupons_coupon_id` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cart_id` int NOT NULL,
  `product_id` int NOT NULL,
  `vendor_id` bigint NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL,
  `shipping_cost` decimal(10,2) DEFAULT '0.00',
  `shipping_method_id` int DEFAULT NULL,
  `is_saved_for_later` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_items_cart_id` (`cart_id`),
  KEY `idx_cart_items_product_id` (`product_id`),
  KEY `idx_cart_items_vendor_id` (`vendor_id`),
  KEY `idx_cart_items_saved` (`is_saved_for_later`),
  CONSTRAINT `fk_cart_items_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `guest_token` varchar(255) DEFAULT NULL,
  `status` enum('draft','abandoned','expired','processing','error','paid','accepted','shipped','cancelled','refunded') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `scheduled_deletion_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_carts_user_id` (`user_id`),
  KEY `idx_carts_guest_token` (`guest_token`),
  KEY `idx_carts_status` (`status`),
  KEY `idx_carts_expires_at` (`expires_at`),
  CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_name` (`name`),
  KEY `fk_categories_parent_id` (`parent_id`),
  CONSTRAINT `fk_categories_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `community_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_profiles` (
  `user_id` bigint NOT NULL,
  `art_style_preferences` json DEFAULT NULL,
  `favorite_colors` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `art_interests` json DEFAULT NULL,
  `collecting_preferences` json DEFAULT NULL,
  `event_preferences` json DEFAULT NULL,
  `followings` json DEFAULT NULL,
  `wishlist` json DEFAULT NULL,
  `collection` json DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `community_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` text,
  `discount_type` enum('percentage','fixed_amount') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_purchase_amount` decimal(10,2) DEFAULT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `is_single_use` tinyint(1) DEFAULT '0',
  `is_vendor_specific` tinyint(1) DEFAULT '0',
  `vendor_id` bigint DEFAULT NULL,
  `valid_from` timestamp NOT NULL,
  `valid_until` timestamp NULL DEFAULT NULL,
  `usage_count` int DEFAULT '0',
  `max_usage_count` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_coupons_code` (`code`),
  KEY `idx_coupons_valid_until` (`valid_until`),
  KEY `idx_coupons_vendor_id` (`vendor_id`),
  KEY `idx_coupons_vendor_specific` (`is_vendor_specific`),
  CONSTRAINT `fk_coupons_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `media_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_library` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` enum('image','video','document','audio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','archived','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_status` (`status`),
  CONSTRAINT `media_library_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `product_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  PRIMARY KEY (`product_id`,`category_id`),
  KEY `fk_pc_category_id` (`category_id`),
  CONSTRAINT `fk_pc_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_pc_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `friendly_name` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `alt_text` varchar(255) DEFAULT NULL,
  `order` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pi_product_id` (`product_id`),
  CONSTRAINT `fk_pi_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_shipping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_shipping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `package_number` int NOT NULL,
  `length` decimal(10,2) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `dimension_unit` enum('in','cm') DEFAULT NULL,
  `weight_unit` enum('lbs','kg') DEFAULT NULL,
  `ship_method` enum('free','flat_rate','calculated') DEFAULT 'free',
  `ship_rate` decimal(10,2) DEFAULT NULL,
  `shipping_type` enum('free','calculated') DEFAULT 'free',
  `shipping_services` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ps_product_package` (`product_id`,`package_number`),
  CONSTRAINT `fk_ps_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT 'Artwork',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `vendor_id` bigint NOT NULL,
  `description` text,
  `short_description` text,
  `available_qty` int NOT NULL DEFAULT '10',
  `category_id` bigint NOT NULL DEFAULT '1',
  `sku` varchar(50) NOT NULL DEFAULT 'SKU-DEFAULT',
  `status` enum('draft','active','deleted','hidden') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `depth` decimal(10,2) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `dimension_unit` enum('in','cm') DEFAULT NULL,
  `weight_unit` enum('lbs','kg') DEFAULT NULL,
  `parent_id` bigint DEFAULT NULL,
  `product_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),
  KEY `fk_products_category_id` (`category_id`),
  KEY `fk_products_parent_id` (`parent_id`),
  KEY `fk_products_created_by` (`created_by`),
  KEY `fk_products_updated_by` (`updated_by`),
  CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2000000222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promoter_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promoter_profiles` (
  `user_id` bigint NOT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `business_phone` varchar(50) DEFAULT NULL,
  `business_website` varchar(255) DEFAULT NULL,
  `business_social_facebook` varchar(255) DEFAULT NULL,
  `business_social_instagram` varchar(255) DEFAULT NULL,
  `business_social_tiktok` varchar(255) DEFAULT NULL,
  `business_social_twitter` varchar(255) DEFAULT NULL,
  `business_social_pinterest` varchar(255) DEFAULT NULL,
  `office_address_line1` varchar(255) DEFAULT NULL,
  `office_address_line2` varchar(255) DEFAULT NULL,
  `office_city` varchar(100) DEFAULT NULL,
  `office_state` varchar(100) DEFAULT NULL,
  `office_zip` varchar(20) DEFAULT NULL,
  `is_non_profit` enum('yes','no') DEFAULT 'no',
  `artwork_description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `legal_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `founding_date` date DEFAULT NULL,
  `organization_size` varchar(50) DEFAULT NULL,
  `business_hours` json DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `slogan` varchar(255) DEFAULT NULL,
  `event_types` json DEFAULT NULL,
  `venue_partnerships` json DEFAULT NULL,
  `past_events` json DEFAULT NULL,
  `upcoming_events` json DEFAULT NULL,
  `specialties` json DEFAULT NULL,
  `sponsorship_options` json DEFAULT NULL,
  `typical_audience_size` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_promoter_profiles_business` (`business_name`),
  CONSTRAINT `promoter_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `sale_price` decimal(10,2) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sales_product_id` (`product_id`),
  CONSTRAINT `fk_sales_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `profile_image_path` varchar(255) DEFAULT NULL,
  `header_image_path` varchar(255) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `social_facebook` varchar(255) DEFAULT NULL,
  `social_instagram` varchar(255) DEFAULT NULL,
  `social_tiktok` varchar(255) DEFAULT NULL,
  `social_twitter` varchar(255) DEFAULT NULL,
  `social_pinterest` varchar(255) DEFAULT NULL,
  `social_whatsapp` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `birth_date` date DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `languages_known` json DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `bio` text,
  `education` json DEFAULT NULL,
  `awards` json DEFAULT NULL,
  `memberships` json DEFAULT NULL,
  `follows` json DEFAULT NULL,
  `timezone` varchar(50) DEFAULT NULL,
  `preferred_currency` varchar(10) DEFAULT NULL,
  `profile_visibility` enum('public','private','connections_only') DEFAULT 'public',
  PRIMARY KEY (`user_id`),
  KEY `idx_user_profiles_name` (`first_name`,`last_name`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `email_verified` enum('yes','no') DEFAULT 'no',
  `user_type` enum('artist','promoter','community','admin') NOT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `google_uid` varchar(128) DEFAULT NULL,
  `last_checklist_pass` timestamp NULL DEFAULT NULL,
  `onboarding_completed` enum('yes','no') DEFAULT 'no',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_google_uid` (`google_uid`)
) ENGINE=InnoDB AUTO_INCREMENT=1234567905 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `variant_kinds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `variant_kinds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `variant_kinds_ibfk_1` (`user_id`),
  CONSTRAINT `variant_kinds_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vendor_shipping_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_shipping_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('free','flat','calculated') NOT NULL,
  `flat_rate` decimal(10,2) DEFAULT NULL,
  `calculation_method` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_shipping_vendor_id` (`vendor_id`),
  KEY `idx_vendor_shipping_default` (`is_default`),
  CONSTRAINT `fk_vendor_shipping_methods_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vendor_sku_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_sku_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `sku` varchar(50) NOT NULL,
  `product_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `vendor_sku_log_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vendor_sku_log_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=338 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

	
admin_profiles	CREATE TABLE `admin_profiles` (\n  `user_id` bigint NOT NULL,\n  `title` varchar(255) DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`user_id`),\n  CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
api_test	CREATE TABLE `api_test` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `is_active` tinyint(1) DEFAULT '1',\n  `message` varchar(255) DEFAULT 'Hello World',\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
artist_profiles	CREATE TABLE `artist_profiles` (\n  `user_id` bigint NOT NULL,\n  `art_categories` json DEFAULT NULL,\n  `art_mediums` json DEFAULT NULL,\n  `business_name` varchar(255) DEFAULT NULL,\n  `studio_address_line1` varchar(255) DEFAULT NULL,\n  `studio_address_line2` varchar(255) DEFAULT NULL,\n  `studio_city` varchar(100) DEFAULT NULL,\n  `studio_state` varchar(100) DEFAULT NULL,\n  `studio_zip` varchar(20) DEFAULT NULL,\n  `artist_biography` text,\n  `business_phone` varchar(50) DEFAULT NULL,\n  `business_website` varchar(255) DEFAULT NULL,\n  `business_social_facebook` varchar(255) DEFAULT NULL,\n  `business_social_instagram` varchar(255) DEFAULT NULL,\n  `business_social_tiktok` varchar(255) DEFAULT NULL,\n  `business_social_twitter` varchar(255) DEFAULT NULL,\n  `business_social_pinterest` varchar(255) DEFAULT NULL,\n  `does_custom` enum('yes','no') DEFAULT 'no',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `customer_service_email` varchar(255) DEFAULT NULL,\n  `legal_name` varchar(255) DEFAULT NULL,\n  `tax_id` varchar(100) DEFAULT NULL,\n  `founding_date` date DEFAULT NULL,\n  `business_size` varchar(50) DEFAULT NULL,\n  `business_hours` json DEFAULT NULL,\n  `price_range` varchar(100) DEFAULT NULL,\n  `payment_methods` json DEFAULT NULL,\n  `service_area` json DEFAULT NULL,\n  `logo_path` varchar(255) DEFAULT NULL,\n  `slogan` varchar(255) DEFAULT NULL,\n  `art_forms` json DEFAULT NULL,\n  `art_style` varchar(255) DEFAULT NULL,\n  `art_genres` json DEFAULT NULL,\n  `teaching_credentials` json DEFAULT NULL,\n  `exhibitions` json DEFAULT NULL,\n  `collections` json DEFAULT NULL,\n  `commission_status` enum('open','closed','waitlist') DEFAULT 'closed',\n  `publications` json DEFAULT NULL,\n  PRIMARY KEY (`user_id`),\n  KEY `idx_artist_profiles_business` (`business_name`),\n  CONSTRAINT `artist_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
cart_applied_coupons	CREATE TABLE `cart_applied_coupons` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `cart_id` int NOT NULL,\n  `coupon_id` int NOT NULL,\n  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `discount_amount` decimal(10,2) NOT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `cart_id` (`cart_id`,`coupon_id`),\n  KEY `fk_cart_applied_coupons_coupon_id` (`coupon_id`),\n  CONSTRAINT `fk_cart_applied_coupons_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,\n  CONSTRAINT `fk_cart_applied_coupons_coupon_id` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
cart_items	CREATE TABLE `cart_items` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `cart_id` int NOT NULL,\n  `product_id` int NOT NULL,\n  `vendor_id` bigint NOT NULL,\n  `quantity` int NOT NULL DEFAULT '1',\n  `price` decimal(10,2) NOT NULL,\n  `shipping_cost` decimal(10,2) DEFAULT '0.00',\n  `shipping_method_id` int DEFAULT NULL,\n  `is_saved_for_later` tinyint(1) DEFAULT '0',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `idx_cart_items_cart_id` (`cart_id`),\n  KEY `idx_cart_items_product_id` (`product_id`),\n  KEY `idx_cart_items_vendor_id` (`vendor_id`),\n  KEY `idx_cart_items_saved` (`is_saved_for_later`),\n  CONSTRAINT `fk_cart_items_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,\n  CONSTRAINT `fk_cart_items_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
carts	CREATE TABLE `carts` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` bigint DEFAULT NULL,\n  `guest_token` varchar(255) DEFAULT NULL,\n  `status` enum('draft','abandoned','expired','processing','error','paid','accepted','shipped','cancelled','refunded') DEFAULT 'draft',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `expires_at` timestamp NULL DEFAULT NULL,\n  `scheduled_deletion_at` timestamp NULL DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  KEY `idx_carts_user_id` (`user_id`),\n  KEY `idx_carts_guest_token` (`guest_token`),\n  KEY `idx_carts_status` (`status`),\n  KEY `idx_carts_expires_at` (`expires_at`),\n  CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
categories	CREATE TABLE `categories` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `name` varchar(100) NOT NULL,\n  `parent_id` bigint DEFAULT NULL,\n  `description` text,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uk_categories_name` (`name`),\n  KEY `fk_categories_parent_id` (`parent_id`),\n  CONSTRAINT `fk_categories_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
community_profiles	CREATE TABLE `community_profiles` (\n  `user_id` bigint NOT NULL,\n  `art_style_preferences` json DEFAULT NULL,\n  `favorite_colors` json DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `art_interests` json DEFAULT NULL,\n  `collecting_preferences` json DEFAULT NULL,\n  `event_preferences` json DEFAULT NULL,\n  `followings` json DEFAULT NULL,\n  `wishlist` json DEFAULT NULL,\n  `collection` json DEFAULT NULL,\n  PRIMARY KEY (`user_id`),\n  CONSTRAINT `community_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
coupons	CREATE TABLE `coupons` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `code` varchar(50) NOT NULL,\n  `description` text,\n  `discount_type` enum('percentage','fixed_amount') NOT NULL,\n  `discount_value` decimal(10,2) NOT NULL,\n  `min_purchase_amount` decimal(10,2) DEFAULT NULL,\n  `max_discount_amount` decimal(10,2) DEFAULT NULL,\n  `is_single_use` tinyint(1) DEFAULT '0',\n  `is_vendor_specific` tinyint(1) DEFAULT '0',\n  `vendor_id` bigint DEFAULT NULL,\n  `valid_from` timestamp NOT NULL,\n  `valid_until` timestamp NULL DEFAULT NULL,\n  `usage_count` int DEFAULT '0',\n  `max_usage_count` int DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `code` (`code`),\n  KEY `idx_coupons_code` (`code`),\n  KEY `idx_coupons_valid_until` (`valid_until`),\n  KEY `idx_coupons_vendor_id` (`vendor_id`),\n  KEY `idx_coupons_vendor_specific` (`is_vendor_specific`),\n  CONSTRAINT `fk_coupons_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
media_library	CREATE TABLE `media_library` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `user_id` bigint NOT NULL,\n  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `file_type` enum('image','video','document','audio') COLLATE utf8mb4_unicode_ci NOT NULL,\n  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `size_bytes` int DEFAULT NULL,\n  `width` int DEFAULT NULL,\n  `height` int DEFAULT NULL,\n  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `description` text COLLATE utf8mb4_unicode_ci,\n  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,\n  `status` enum('active','archived','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'active',\n  PRIMARY KEY (`id`),\n  KEY `idx_user_id` (`user_id`),\n  KEY `idx_file_type` (`file_type`),\n  KEY `idx_status` (`status`),\n  CONSTRAINT `media_library_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	
product_categories	CREATE TABLE `product_categories` (\n  `product_id` bigint NOT NULL,\n  `category_id` bigint NOT NULL,\n  PRIMARY KEY (`product_id`,`category_id`),\n  KEY `fk_pc_category_id` (`category_id`),\n  CONSTRAINT `fk_pc_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),\n  CONSTRAINT `fk_pc_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
product_images	CREATE TABLE `product_images` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `product_id` bigint NOT NULL,\n  `image_url` varchar(255) NOT NULL,\n  `friendly_name` varchar(255) DEFAULT NULL,\n  `is_primary` tinyint(1) DEFAULT '0',\n  `alt_text` varchar(255) DEFAULT NULL,\n  `order` int DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  KEY `fk_pi_product_id` (`product_id`),\n  CONSTRAINT `fk_pi_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
product_shipping	CREATE TABLE `product_shipping` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `product_id` bigint NOT NULL,\n  `package_number` int NOT NULL,\n  `length` decimal(10,2) DEFAULT NULL,\n  `width` decimal(10,2) DEFAULT NULL,\n  `height` decimal(10,2) DEFAULT NULL,\n  `weight` decimal(10,2) DEFAULT NULL,\n  `dimension_unit` enum('in','cm') DEFAULT NULL,\n  `weight_unit` enum('lbs','kg') DEFAULT NULL,\n  `ship_method` enum('free','flat_rate','calculated') DEFAULT 'free',\n  `ship_rate` decimal(10,2) DEFAULT NULL,\n  `shipping_type` enum('free','calculated') DEFAULT 'free',\n  `shipping_services` text,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uk_ps_product_package` (`product_id`,`package_number`),\n  CONSTRAINT `fk_ps_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
products	CREATE TABLE `products` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `name` varchar(100) NOT NULL DEFAULT 'Artwork',\n  `price` decimal(10,2) NOT NULL DEFAULT '0.00',\n  `vendor_id` bigint NOT NULL,\n  `description` text,\n  `short_description` text,\n  `available_qty` int NOT NULL DEFAULT '10',\n  `category_id` bigint NOT NULL DEFAULT '1',\n  `sku` varchar(50) NOT NULL DEFAULT 'SKU-DEFAULT',\n  `status` enum('draft','active','deleted','hidden') DEFAULT 'draft',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `created_by` bigint NOT NULL,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `updated_by` bigint DEFAULT NULL,\n  `width` decimal(10,2) DEFAULT NULL,\n  `height` decimal(10,2) DEFAULT NULL,\n  `depth` decimal(10,2) DEFAULT NULL,\n  `weight` decimal(10,2) DEFAULT NULL,\n  `dimension_unit` enum('in','cm') DEFAULT NULL,\n  `weight_unit` enum('lbs','kg') DEFAULT NULL,\n  `parent_id` bigint DEFAULT NULL,\n  `product_type` varchar(20) DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uk_products_sku` (`sku`),\n  UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),\n  KEY `fk_products_category_id` (`category_id`),\n  KEY `fk_products_parent_id` (`parent_id`),\n  KEY `fk_products_created_by` (`created_by`),\n  KEY `fk_products_updated_by` (`updated_by`),\n  CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),\n  CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_products_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`),\n  CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2000000222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
promoter_profiles	CREATE TABLE `promoter_profiles` (\n  `user_id` bigint NOT NULL,\n  `business_name` varchar(255) DEFAULT NULL,\n  `business_phone` varchar(50) DEFAULT NULL,\n  `business_website` varchar(255) DEFAULT NULL,\n  `business_social_facebook` varchar(255) DEFAULT NULL,\n  `business_social_instagram` varchar(255) DEFAULT NULL,\n  `business_social_tiktok` varchar(255) DEFAULT NULL,\n  `business_social_twitter` varchar(255) DEFAULT NULL,\n  `business_social_pinterest` varchar(255) DEFAULT NULL,\n  `office_address_line1` varchar(255) DEFAULT NULL,\n  `office_address_line2` varchar(255) DEFAULT NULL,\n  `office_city` varchar(100) DEFAULT NULL,\n  `office_state` varchar(100) DEFAULT NULL,\n  `office_zip` varchar(20) DEFAULT NULL,\n  `is_non_profit` enum('yes','no') DEFAULT 'no',\n  `artwork_description` text,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `legal_name` varchar(255) DEFAULT NULL,\n  `tax_id` varchar(100) DEFAULT NULL,\n  `founding_date` date DEFAULT NULL,\n  `organization_size` varchar(50) DEFAULT NULL,\n  `business_hours` json DEFAULT NULL,\n  `logo_path` varchar(255) DEFAULT NULL,\n  `slogan` varchar(255) DEFAULT NULL,\n  `event_types` json DEFAULT NULL,\n  `venue_partnerships` json DEFAULT NULL,\n  `past_events` json DEFAULT NULL,\n  `upcoming_events` json DEFAULT NULL,\n  `specialties` json DEFAULT NULL,\n  `sponsorship_options` json DEFAULT NULL,\n  `typical_audience_size` varchar(100) DEFAULT NULL,\n  PRIMARY KEY (`user_id`),\n  KEY `idx_promoter_profiles_business` (`business_name`),\n  CONSTRAINT `promoter_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
sales	CREATE TABLE `sales` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `product_id` bigint NOT NULL,\n  `sale_price` decimal(10,2) NOT NULL,\n  `start_date` datetime NOT NULL,\n  `end_date` datetime NOT NULL,\n  PRIMARY KEY (`id`),\n  KEY `fk_sales_product_id` (`product_id`),\n  CONSTRAINT `fk_sales_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
user_profiles	CREATE TABLE `user_profiles` (\n  `user_id` bigint NOT NULL,\n  `first_name` varchar(100) DEFAULT NULL,\n  `last_name` varchar(100) DEFAULT NULL,\n  `phone` varchar(50) DEFAULT NULL,\n  `address_line1` varchar(255) DEFAULT NULL,\n  `address_line2` varchar(255) DEFAULT NULL,\n  `city` varchar(100) DEFAULT NULL,\n  `state` varchar(100) DEFAULT NULL,\n  `postal_code` varchar(20) DEFAULT NULL,\n  `country` varchar(100) DEFAULT NULL,\n  `profile_image_path` varchar(255) DEFAULT NULL,\n  `header_image_path` varchar(255) DEFAULT NULL,\n  `display_name` varchar(100) DEFAULT NULL,\n  `website` varchar(255) DEFAULT NULL,\n  `social_facebook` varchar(255) DEFAULT NULL,\n  `social_instagram` varchar(255) DEFAULT NULL,\n  `social_tiktok` varchar(255) DEFAULT NULL,\n  `social_twitter` varchar(255) DEFAULT NULL,\n  `social_pinterest` varchar(255) DEFAULT NULL,\n  `social_whatsapp` varchar(255) DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `birth_date` date DEFAULT NULL,\n  `gender` varchar(50) DEFAULT NULL,\n  `nationality` varchar(100) DEFAULT NULL,\n  `languages_known` json DEFAULT NULL,\n  `job_title` varchar(255) DEFAULT NULL,\n  `bio` text,\n  `education` json DEFAULT NULL,\n  `awards` json DEFAULT NULL,\n  `memberships` json DEFAULT NULL,\n  `follows` json DEFAULT NULL,\n  `timezone` varchar(50) DEFAULT NULL,\n  `preferred_currency` varchar(10) DEFAULT NULL,\n  `profile_visibility` enum('public','private','connections_only') DEFAULT 'public',\n  PRIMARY KEY (`user_id`),\n  KEY `idx_user_profiles_name` (`first_name`,`last_name`),\n  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
users	CREATE TABLE `users` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `username` varchar(255) NOT NULL,\n  `password` varchar(255) DEFAULT NULL,\n  `email_verified` enum('yes','no') DEFAULT 'no',\n  `user_type` enum('artist','promoter','community','admin') NOT NULL,\n  `status` enum('active','inactive','suspended') DEFAULT 'active',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `last_login` timestamp NULL DEFAULT NULL,\n  `google_uid` varchar(128) DEFAULT NULL,\n  `last_checklist_pass` timestamp NULL DEFAULT NULL,\n  `onboarding_completed` enum('yes','no') DEFAULT 'no',\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `username` (`username`),\n  KEY `idx_google_uid` (`google_uid`)\n) ENGINE=InnoDB AUTO_INCREMENT=1234567905 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
variant_kinds	CREATE TABLE `variant_kinds` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` bigint NOT NULL,\n  `name` varchar(50) NOT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `variant_kinds_ibfk_1` (`user_id`),\n  CONSTRAINT `variant_kinds_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
vendor_shipping_methods	CREATE TABLE `vendor_shipping_methods` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `vendor_id` bigint NOT NULL,\n  `name` varchar(100) NOT NULL,\n  `type` enum('free','flat','calculated') NOT NULL,\n  `flat_rate` decimal(10,2) DEFAULT NULL,\n  `calculation_method` varchar(50) DEFAULT NULL,\n  `is_default` tinyint(1) DEFAULT '0',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `idx_vendor_shipping_vendor_id` (`vendor_id`),\n  KEY `idx_vendor_shipping_default` (`is_default`),\n  CONSTRAINT `fk_vendor_shipping_methods_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
	
vendor_sku_log	CREATE TABLE `vendor_sku_log` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `vendor_id` bigint NOT NULL,\n  `sku` varchar(50) NOT NULL,\n  `product_id` bigint DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),\n  KEY `product_id` (`product_id`),\n  CONSTRAINT `vendor_sku_log_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `vendor_sku_log_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=338 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

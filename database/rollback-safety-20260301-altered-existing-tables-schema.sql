-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: 10.128.0.31    Database: wordpress_import
-- ------------------------------------------------------
-- Server version	8.0.41-cluster

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

--
-- Table structure for table `walmart_corporate_products`
--

DROP TABLE IF EXISTS `walmart_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `walmart_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `walmart_item_id` varchar(100) DEFAULT NULL,
  `walmart_feed_id` varchar(100) DEFAULT NULL,
  `walmart_title` varchar(255) DEFAULT NULL,
  `walmart_description` text,
  `walmart_short_description` varchar(1000) DEFAULT NULL,
  `walmart_key_features` json DEFAULT NULL,
  `walmart_main_image_url` varchar(500) DEFAULT NULL,
  `walmart_additional_images` json DEFAULT NULL,
  `walmart_color` varchar(100) DEFAULT NULL,
  `walmart_size` varchar(100) DEFAULT NULL,
  `walmart_material` varchar(100) DEFAULT NULL,
  `walmart_msrp` decimal(10,2) DEFAULT NULL,
  `walmart_shipping_weight` decimal(8,2) DEFAULT NULL,
  `walmart_shipping_length` decimal(8,2) DEFAULT NULL,
  `walmart_shipping_width` decimal(8,2) DEFAULT NULL,
  `walmart_shipping_height` decimal(8,2) DEFAULT NULL,
  `walmart_tax_code` varchar(20) DEFAULT NULL,
  `walmart_origin_country` varchar(2) DEFAULT NULL,
  `walmart_prop65_warning` text,
  `walmart_compliance_notes` text,
  `walmart_custom_fields` json DEFAULT NULL,
  `walmart_price` decimal(10,2) DEFAULT NULL,
  `walmart_category_id` varchar(100) DEFAULT NULL,
  `walmart_category_path` varchar(500) DEFAULT NULL,
  `walmart_product_type` varchar(255) DEFAULT NULL,
  `walmart_brand` varchar(100) DEFAULT NULL,
  `walmart_manufacturer` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','removing','removed','cooldown') DEFAULT 'pending',
  `terms_accepted_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `sync_status` enum('pending','synced','error') DEFAULT 'pending',
  `sync_error` text,
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `last_sync_attempt` timestamp NULL DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`listing_status`),
  KEY `idx_active` (`is_active`),
  KEY `idx_cooldown` (`cooldown_ends_at`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wayfair_corporate_products`
--

DROP TABLE IF EXISTS `wayfair_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wayfair_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `wayfair_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Wayfair supplier SKU',
  `wayfair_part_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Wayfair part number',
  `wayfair_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_description` text COLLATE utf8mb4_unicode_ci,
  `wayfair_short_description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_key_features` json DEFAULT NULL COMMENT 'Array of product features',
  `wayfair_price` decimal(10,2) DEFAULT NULL,
  `wayfair_main_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_additional_images` json DEFAULT NULL COMMENT 'Array of additional image URLs',
  `wayfair_category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_material` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_room_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_collection` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_in_house_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wayfair_custom_fields` json DEFAULT NULL,
  `wayfair_dimensions` json DEFAULT NULL COMMENT 'Width, height, depth, weight',
  `wayfair_shipping_weight` decimal(8,2) DEFAULT NULL COMMENT 'Weight in lbs',
  `wayfair_shipping_length` decimal(8,2) DEFAULT NULL COMMENT 'Length in inches',
  `wayfair_shipping_width` decimal(8,2) DEFAULT NULL COMMENT 'Width in inches',
  `wayfair_shipping_height` decimal(8,2) DEFAULT NULL COMMENT 'Height in inches',
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `last_sync_at` datetime DEFAULT NULL,
  `last_sync_error` text COLLATE utf8mb4_unicode_ci,
  `terms_accepted_at` datetime DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL COMMENT '60-day cooldown after removal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL COMMENT 'User ID who created listing',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_user` (`product_id`,`user_id`),
  KEY `idx_wayfair_user_id` (`user_id`),
  KEY `idx_wayfair_listing_status` (`listing_status`),
  KEY `idx_wayfair_sync_status` (`sync_status`),
  KEY `idx_wayfair_created_by` (`created_by`),
  KEY `idx_wayfair_cooldown` (`cooldown_ends_at`),
  KEY `idx_wayfair_sku` (`wayfair_sku`),
  CONSTRAINT `wayfair_corporate_products_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wayfair_corporate_products_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Wayfair corporate product listings - Admin approval workflow for Brakebee Wayfair Supplier account';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiktok_product_data`
--

DROP TABLE IF EXISTS `tiktok_product_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiktok_product_data` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `shop_id` varchar(100) DEFAULT NULL,
  `product_id` bigint NOT NULL,
  `tiktok_product_id` varchar(100) DEFAULT NULL,
  `tiktok_sku_id` varchar(100) DEFAULT NULL,
  `tiktok_title` varchar(255) DEFAULT NULL,
  `tiktok_description` text,
  `tiktok_price` decimal(10,2) DEFAULT NULL,
  `tiktok_tags` text,
  `tiktok_category_id` varchar(50) DEFAULT NULL,
  `tiktok_size_chart_id` varchar(100) DEFAULT NULL,
  `tiktok_seller_warranty` varchar(255) DEFAULT NULL,
  `tiktok_custom_fields` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sync_status` enum('pending','synced','error') DEFAULT 'pending',
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `inventory_synced_at` datetime DEFAULT NULL,
  `api_inventory_pushed_at` datetime DEFAULT NULL,
  `last_sync_error` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_tiktok_product_id` (`tiktok_product_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_sync_status` (`sync_status`),
  KEY `idx_tiktok_sku_id` (`tiktok_sku_id`),
  KEY `idx_shop_id` (`shop_id`),
  CONSTRAINT `tiktok_product_data_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tiktok_product_data_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='TikTok-optimized product data and SEO settings';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiktok_corporate_products`
--

DROP TABLE IF EXISTS `tiktok_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiktok_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `tiktok_product_id` varchar(100) DEFAULT NULL,
  `tiktok_sku_id` varchar(100) DEFAULT NULL,
  `corporate_title` varchar(255) DEFAULT NULL,
  `corporate_description` text,
  `corporate_short_description` varchar(1000) DEFAULT NULL,
  `corporate_key_features` json DEFAULT NULL,
  `corporate_main_image_url` varchar(500) DEFAULT NULL,
  `corporate_additional_images` json DEFAULT NULL,
  `corporate_category_id` varchar(100) DEFAULT NULL,
  `corporate_size_chart_id` varchar(100) DEFAULT NULL,
  `corporate_custom_fields` json DEFAULT NULL,
  `corporate_brand` varchar(100) DEFAULT NULL,
  `corporate_price` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') DEFAULT 'pending',
  `last_sync_at` datetime DEFAULT NULL,
  `last_sync_error` text,
  `terms_accepted_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_corporate_product` (`product_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_tiktok_product_id` (`tiktok_product_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_tiktok_corp_user_id` (`user_id`),
  KEY `idx_tiktok_corp_listing_status` (`listing_status`),
  KEY `idx_tiktok_corp_sync_status` (`sync_status`),
  KEY `idx_tiktok_corp_created_by` (`created_by`),
  KEY `idx_tiktok_corp_cooldown` (`cooldown_ends_at`),
  KEY `idx_tiktok_corp_tiktok_sku` (`tiktok_sku_id`),
  CONSTRAINT `fk_tiktok_corporate_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tiktok_corporate_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tiktok_corporate_products_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tiktok_corporate_products_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='TikTok Shop corporate product listings - Admin approval workflow for Brakebee TikTok Shop';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `etsy_product_data`
--

DROP TABLE IF EXISTS `etsy_product_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etsy_product_data` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `shop_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Etsy shop ID',
  `etsy_listing_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Etsy listing ID',
  `etsy_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_description` text COLLATE utf8mb4_unicode_ci,
  `etsy_price` decimal(10,2) DEFAULT NULL,
  `etsy_quantity` int DEFAULT NULL,
  `etsy_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_tags` json DEFAULT NULL COMMENT 'Array of tags',
  `etsy_materials` json DEFAULT NULL COMMENT 'Array of materials',
  `etsy_category_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_taxonomy_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_images` json DEFAULT NULL COMMENT 'Array of image URLs',
  `etsy_shipping_profile_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_personalization_enabled` tinyint(1) DEFAULT '0',
  `etsy_occasion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etsy_custom_fields` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_state` enum('active','inactive','draft','sold_out','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `last_sync_at` datetime DEFAULT NULL,
  `last_sync_error` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  UNIQUE KEY `etsy_listing_id` (`etsy_listing_id`),
  KEY `idx_etsy_product_user` (`user_id`),
  KEY `idx_etsy_product_id` (`product_id`),
  KEY `idx_etsy_product_shop` (`shop_id`),
  KEY `idx_etsy_listing_id` (`etsy_listing_id`),
  KEY `idx_etsy_sync_status` (`sync_status`),
  KEY `idx_etsy_listing_state` (`listing_state`),
  CONSTRAINT `etsy_product_data_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `etsy_product_data_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `etsy_product_data_ibfk_3` FOREIGN KEY (`shop_id`) REFERENCES `etsy_user_shops` (`shop_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Etsy product listings - User shop products';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiktok_orders`
--

DROP TABLE IF EXISTS `tiktok_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiktok_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `tiktok_order_id` varchar(100) NOT NULL,
  `tiktok_shop_id` varchar(100) DEFAULT NULL,
  `order_data` json DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `shipping_address` json DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `order_status` varchar(50) DEFAULT NULL,
  `processed_to_main` tinyint(1) DEFAULT '0',
  `main_order_id` bigint DEFAULT NULL,
  `tracking_synced_at` datetime DEFAULT NULL,
  `api_tracking_pushed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tiktok_order` (`tiktok_order_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_tiktok_order_id` (`tiktok_order_id`),
  KEY `idx_processed` (`processed_to_main`),
  KEY `idx_main_order_id` (`main_order_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `tiktok_orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Raw TikTok orders for isolated processing';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiktok_user_shops`
--

DROP TABLE IF EXISTS `tiktok_user_shops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiktok_user_shops` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `shop_id` varchar(100) NOT NULL,
  `shop_name` varchar(255) DEFAULT NULL,
  `access_token` text,
  `refresh_token` text,
  `token_expires_at` timestamp NULL DEFAULT NULL,
  `token_refresh_count` int DEFAULT '0',
  `last_token_refresh_at` timestamp NULL DEFAULT NULL,
  `shop_region` varchar(10) DEFAULT NULL,
  `app_key` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `terms_accepted` tinyint(1) DEFAULT '0',
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `last_order_sync` datetime DEFAULT NULL,
  `last_return_sync` datetime DEFAULT NULL,
  `last_products_sync_at` timestamp NULL DEFAULT NULL,
  `last_orders_sync_at` timestamp NULL DEFAULT NULL,
  `last_inventory_sync_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_shop` (`user_id`,`shop_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_shop_id` (`shop_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `tiktok_user_shops_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='TikTok shop connections and OAuth tokens';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-01  1:24:50

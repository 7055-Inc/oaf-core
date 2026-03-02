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
-- Table structure for table `marketplace_product_mappings`
--

DROP TABLE IF EXISTS `marketplace_product_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_product_mappings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `connector` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'walmart|wayfair|tiktok|etsy|amazon',
  `mapping_scope` enum('personal','corporate') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'corporate',
  `user_id` bigint NOT NULL,
  `external_account_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `product_id` bigint NOT NULL,
  `external_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Marketplace listing/product ID',
  `external_sku` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Marketplace SKU/part number',
  `external_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `match_type` enum('manual','auto_exact_sku','auto_title','imported') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `match_confidence` decimal(5,2) DEFAULT NULL COMMENT '0-100 confidence score',
  `status` enum('mapped','unmapped','conflict','ignored') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mapped',
  `external_payload` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mapping_connector_scope_product` (`connector`,`mapping_scope`,`user_id`,`product_id`,`external_account_id`),
  UNIQUE KEY `uniq_mapping_connector_scope_external` (`connector`,`mapping_scope`,`user_id`,`external_id`,`external_account_id`),
  KEY `fk_mapping_user` (`user_id`),
  KEY `idx_mapping_connector_user_status` (`connector`,`user_id`,`status`),
  KEY `idx_mapping_external_sku` (`connector`,`user_id`,`external_sku`),
  KEY `idx_mapping_product` (`product_id`),
  KEY `idx_mapping_connector_scope_user_status` (`connector`,`mapping_scope`,`user_id`,`status`),
  CONSTRAINT `fk_mapping_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mapping_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shared cross-connector mapping table for marketplace listings';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marketplace_product_mappings`
--

LOCK TABLES `marketplace_product_mappings` WRITE;
/*!40000 ALTER TABLE `marketplace_product_mappings` DISABLE KEYS */;
/*!40000 ALTER TABLE `marketplace_product_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marketplace_activity_log`
--

DROP TABLE IF EXISTS `marketplace_activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_activity_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `connector` varchar(32) NOT NULL,
  `mapping_scope` enum('personal','corporate') DEFAULT NULL,
  `activity_type` varchar(64) NOT NULL,
  `status` enum('success','error') NOT NULL DEFAULT 'success',
  `severity` enum('info','warning','error') NOT NULL DEFAULT 'info',
  `user_id` bigint DEFAULT NULL,
  `actor_user_id` bigint DEFAULT NULL,
  `product_id` bigint DEFAULT NULL,
  `mapping_id` bigint DEFAULT NULL,
  `external_account_id` varchar(255) DEFAULT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `external_sku` varchar(255) DEFAULT NULL,
  `external_title` varchar(255) DEFAULT NULL,
  `message` varchar(500) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_marketplace_activity_created_at` (`created_at`),
  KEY `idx_marketplace_activity_connector` (`connector`),
  KEY `idx_marketplace_activity_status` (`status`),
  KEY `idx_marketplace_activity_activity_type` (`activity_type`),
  KEY `idx_marketplace_activity_user_id` (`user_id`),
  KEY `idx_marketplace_activity_actor_user_id` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marketplace_activity_log`
--

LOCK TABLES `marketplace_activity_log` WRITE;
/*!40000 ALTER TABLE `marketplace_activity_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `marketplace_activity_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `amazon_corporate_products`
--

DROP TABLE IF EXISTS `amazon_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amazon_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `amazon_asin` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_description` text COLLATE utf8mb4_unicode_ci,
  `amazon_price` decimal(10,2) DEFAULT NULL,
  `amazon_category_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_category_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_condition` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_fulfillment_channel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amazon_custom_fields` json DEFAULT NULL,
  `amazon_bullet_points` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `terms_accepted_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_amazon_product_user` (`product_id`,`user_id`),
  KEY `idx_amazon_user` (`user_id`),
  KEY `idx_amazon_asin` (`amazon_asin`),
  KEY `idx_amazon_status` (`listing_status`),
  CONSTRAINT `fk_amazon_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_amazon_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amazon_corporate_products`
--

LOCK TABLES `amazon_corporate_products` WRITE;
/*!40000 ALTER TABLE `amazon_corporate_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `amazon_corporate_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `amazon_inventory_allocations`
--

DROP TABLE IF EXISTS `amazon_inventory_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amazon_inventory_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `allocated_quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_amazon_inv_user_product` (`user_id`,`product_id`),
  KEY `idx_amazon_inv_user` (`user_id`),
  KEY `idx_amazon_inv_product` (`product_id`),
  CONSTRAINT `fk_amazon_inv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_amazon_inv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amazon_inventory_allocations`
--

LOCK TABLES `amazon_inventory_allocations` WRITE;
/*!40000 ALTER TABLE `amazon_inventory_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `amazon_inventory_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faire_corporate_products`
--

DROP TABLE IF EXISTS `faire_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faire_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `faire_listing_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_description` text COLLATE utf8mb4_unicode_ci,
  `faire_price` decimal(10,2) DEFAULT NULL,
  `faire_category_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_category_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faire_lead_time_days` int DEFAULT NULL,
  `faire_case_pack_qty` int DEFAULT NULL,
  `faire_custom_fields` json DEFAULT NULL,
  `faire_keywords` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `terms_accepted_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_faire_product_user` (`product_id`,`user_id`),
  KEY `idx_faire_user` (`user_id`),
  KEY `idx_faire_listing` (`faire_listing_id`),
  KEY `idx_faire_status` (`listing_status`),
  CONSTRAINT `fk_faire_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faire_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faire_corporate_products`
--

LOCK TABLES `faire_corporate_products` WRITE;
/*!40000 ALTER TABLE `faire_corporate_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `faire_corporate_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faire_inventory_allocations`
--

DROP TABLE IF EXISTS `faire_inventory_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faire_inventory_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `allocated_quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_faire_inv_user_product` (`user_id`,`product_id`),
  KEY `idx_faire_inv_user` (`user_id`),
  KEY `idx_faire_inv_product` (`product_id`),
  CONSTRAINT `fk_faire_inv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faire_inv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faire_inventory_allocations`
--

LOCK TABLES `faire_inventory_allocations` WRITE;
/*!40000 ALTER TABLE `faire_inventory_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `faire_inventory_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ebay_corporate_products`
--

DROP TABLE IF EXISTS `ebay_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ebay_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `ebay_item_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_description` text COLLATE utf8mb4_unicode_ci,
  `ebay_price` decimal(10,2) DEFAULT NULL,
  `ebay_category_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_category_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_condition` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_listing_format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ebay_custom_fields` json DEFAULT NULL,
  `ebay_item_specifics` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `terms_accepted_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ebay_product_user` (`product_id`,`user_id`),
  KEY `idx_ebay_user` (`user_id`),
  KEY `idx_ebay_item` (`ebay_item_id`),
  KEY `idx_ebay_status` (`listing_status`),
  CONSTRAINT `fk_ebay_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ebay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ebay_corporate_products`
--

LOCK TABLES `ebay_corporate_products` WRITE;
/*!40000 ALTER TABLE `ebay_corporate_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `ebay_corporate_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ebay_inventory_allocations`
--

DROP TABLE IF EXISTS `ebay_inventory_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ebay_inventory_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `allocated_quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ebay_inv_user_product` (`user_id`,`product_id`),
  KEY `idx_ebay_inv_user` (`user_id`),
  KEY `idx_ebay_inv_product` (`product_id`),
  CONSTRAINT `fk_ebay_inv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ebay_inv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ebay_inventory_allocations`
--

LOCK TABLES `ebay_inventory_allocations` WRITE;
/*!40000 ALTER TABLE `ebay_inventory_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `ebay_inventory_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_corporate_products`
--

DROP TABLE IF EXISTS `meta_corporate_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_corporate_products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `meta_catalog_item_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_description` text COLLATE utf8mb4_unicode_ci,
  `meta_price` decimal(10,2) DEFAULT NULL,
  `meta_category_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_category_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_product_group_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_google_product_category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_custom_fields` json DEFAULT NULL,
  `meta_attributes` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `listing_status` enum('pending','listed','paused','removing','removed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sync_status` enum('pending','syncing','synced','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `terms_accepted_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `cooldown_ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_meta_product_user` (`product_id`,`user_id`),
  KEY `idx_meta_user` (`user_id`),
  KEY `idx_meta_catalog_item` (`meta_catalog_item_id`),
  KEY `idx_meta_status` (`listing_status`),
  CONSTRAINT `fk_meta_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_meta_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_corporate_products`
--

LOCK TABLES `meta_corporate_products` WRITE;
/*!40000 ALTER TABLE `meta_corporate_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_corporate_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta_inventory_allocations`
--

DROP TABLE IF EXISTS `meta_inventory_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta_inventory_allocations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `allocated_quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_meta_inv_user_product` (`user_id`,`product_id`),
  KEY `idx_meta_inv_user` (`user_id`),
  KEY `idx_meta_inv_product` (`product_id`),
  CONSTRAINT `fk_meta_inv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_meta_inv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta_inventory_allocations`
--

LOCK TABLES `meta_inventory_allocations` WRITE;
/*!40000 ALTER TABLE `meta_inventory_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `meta_inventory_allocations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-01  1:24:49

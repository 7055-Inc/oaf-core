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
-- Table structure for table `website_addons`
--

DROP TABLE IF EXISTS `website_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `website_addons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `addon_name` varchar(100) NOT NULL,
  `addon_slug` varchar(100) NOT NULL,
  `description` text,
  `addon_script_path` varchar(500) NOT NULL,
  `tier_required` enum('free','basic','professional') NOT NULL DEFAULT 'free',
  `monthly_price` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_level` tinyint(1) DEFAULT '0' COMMENT 'Whether this addon applies to user (1) or site (0)',
  `category` enum('site_features','user_features','marketplace','analytics','integrations') DEFAULT 'site_features' COMMENT 'Addon category for organization',
  PRIMARY KEY (`id`),
  UNIQUE KEY `addon_slug` (`addon_slug`),
  KEY `idx_tier_required` (`tier_required`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `website_addons`
--
-- WHERE:  addon_slug IN ('amazon-connector','faire-connector','ebay-connector','meta-connector')

LOCK TABLES `website_addons` WRITE;
/*!40000 ALTER TABLE `website_addons` DISABLE KEYS */;
INSERT INTO `website_addons` VALUES (5,'Amazon Connector','amazon-connector','Connect your catalog to Amazon listings and mapping workflows.','/addons/amazon-connector.js','professional',29.00,1,9,'2025-08-11 04:15:52','2026-03-01 04:58:29',1,'marketplace'),(24,'eBay Connector','ebay-connector','Connect your catalog to eBay listings and mapping workflows.','/addons/ebay-connector.js','professional',19.00,1,11,'2026-03-01 04:58:29','2026-03-01 04:58:29',1,'marketplace'),(23,'Faire Connector','faire-connector','Connect your catalog to Faire listings and mapping workflows.','/addons/faire-connector.js','professional',19.00,1,10,'2026-03-01 04:58:29','2026-03-01 04:58:29',1,'marketplace'),(25,'Meta Connector','meta-connector','Connect your catalog to Meta listings and mapping workflows.','/addons/meta-connector.js','professional',19.00,1,12,'2026-03-01 04:58:29','2026-03-01 04:58:29',1,'marketplace');
/*!40000 ALTER TABLE `website_addons` ENABLE KEYS */;
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

-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: 10.128.0.31    Database: oaf
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
-- Table structure for table `admin_profiles`
--

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

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `show_from` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `target_user_types` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_active_dates` (`is_active`,`show_from`,`expires_at`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `api_key_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `public_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `private_key_hashed` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `rate_limit` int DEFAULT '1000',
  PRIMARY KEY (`api_key_id`),
  UNIQUE KEY `public_key` (`public_key`),
  KEY `idx_public_key` (`public_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_test`
--

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

--
-- Table structure for table `api_tokens`
--

DROP TABLE IF EXISTS `api_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `service` enum('api2','etsy','amazon') NOT NULL,
  `token` varchar(255) NOT NULL,
  `refresh_token` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_service` (`user_id`,`service`),
  CONSTRAINT `fk_api_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_addon_requests`
--

DROP TABLE IF EXISTS `application_addon_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_addon_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `available_addon_id` bigint NOT NULL,
  `requested` tinyint(1) DEFAULT '0',
  `priority` int DEFAULT '0',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_application_addon_request` (`application_id`,`available_addon_id`),
  KEY `idx_application_requests` (`application_id`),
  KEY `idx_addon_requests` (`available_addon_id`),
  CONSTRAINT `application_addon_requests_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `application_addon_requests_ibfk_2` FOREIGN KEY (`available_addon_id`) REFERENCES `event_available_addons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_email_log`
--

DROP TABLE IF EXISTS `application_email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_email_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `email_type` varchar(50) NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `success` tinyint(1) DEFAULT '1',
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `idx_application_emails` (`application_id`,`email_type`),
  KEY `idx_email_type_date` (`email_type`,`sent_at`),
  CONSTRAINT `application_email_log_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_field_responses`
--

DROP TABLE IF EXISTS `application_field_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_field_responses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `field_id` bigint NOT NULL,
  `response_value` text,
  `file_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_application_field` (`application_id`,`field_id`),
  KEY `field_id` (`field_id`),
  CONSTRAINT `application_field_responses_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `application_field_responses_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `event_application_fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_analytics`
--

DROP TABLE IF EXISTS `article_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_analytics` (
  `article_id` bigint NOT NULL,
  `view_count` int DEFAULT '0',
  `reading_time_minutes` int DEFAULT NULL,
  `last_viewed` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`article_id`),
  CONSTRAINT `article_analytics_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_connections`
--

DROP TABLE IF EXISTS `article_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_connections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `article_id` bigint NOT NULL,
  `connection_type` enum('user','event','product','category','custom') NOT NULL,
  `connection_id` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_connections_article` (`article_id`),
  KEY `idx_connections_type` (`connection_type`),
  KEY `idx_connections_target` (`connection_type`,`connection_id`),
  CONSTRAINT `article_connections_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_media_seo`
--

DROP TABLE IF EXISTS `article_media_seo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_media_seo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `article_id` bigint NOT NULL,
  `media_id` bigint NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `description` text,
  `caption` text,
  `title_attribute` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_article_media` (`article_id`,`media_id`),
  KEY `media_id` (`media_id`),
  KEY `idx_media_seo_article` (`article_id`),
  CONSTRAINT `article_media_seo_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_media_seo_ibfk_2` FOREIGN KEY (`media_id`) REFERENCES `media_library` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_restrictions`
--

DROP TABLE IF EXISTS `article_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_restrictions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `article_id` bigint NOT NULL,
  `restriction_type` enum('user_type','permission','specific_user') NOT NULL,
  `restriction_value` varchar(255) NOT NULL,
  `logic_operator` enum('any_of','must_meet_all') DEFAULT 'any_of',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_article_restriction` (`article_id`,`restriction_type`,`restriction_value`),
  KEY `idx_restrictions_article` (`article_id`),
  KEY `idx_restrictions_type` (`restriction_type`),
  CONSTRAINT `article_restrictions_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_schema`
--

DROP TABLE IF EXISTS `article_schema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_schema` (
  `article_id` bigint NOT NULL,
  `schema_markup` json DEFAULT NULL,
  `custom_schema_fields` json DEFAULT NULL,
  PRIMARY KEY (`article_id`),
  CONSTRAINT `article_schema_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_seo`
--

DROP TABLE IF EXISTS `article_seo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_seo` (
  `article_id` bigint NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `meta_keywords` varchar(500) DEFAULT NULL,
  `focus_keyword` varchar(100) DEFAULT NULL,
  `canonical_url` varchar(500) DEFAULT NULL,
  `robots_directives` varchar(100) DEFAULT NULL,
  `readability_score` int DEFAULT NULL,
  PRIMARY KEY (`article_id`),
  CONSTRAINT `article_seo_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_series`
--

DROP TABLE IF EXISTS `article_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_series` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `series_name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_series_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_series_relations`
--

DROP TABLE IF EXISTS `article_series_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_series_relations` (
  `article_id` bigint NOT NULL,
  `series_id` bigint NOT NULL,
  `position_in_series` decimal(10,2) NOT NULL,
  PRIMARY KEY (`article_id`,`series_id`),
  KEY `idx_series_position` (`series_id`,`position_in_series`),
  CONSTRAINT `article_series_relations_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_series_relations_ibfk_2` FOREIGN KEY (`series_id`) REFERENCES `article_series` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_social`
--

DROP TABLE IF EXISTS `article_social`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_social` (
  `article_id` bigint NOT NULL,
  `og_title` varchar(255) DEFAULT NULL,
  `og_description` text,
  `og_image_id` bigint DEFAULT NULL,
  `twitter_card_type` enum('summary','summary_large_image','app','player') DEFAULT 'summary',
  `twitter_image_id` bigint DEFAULT NULL,
  `twitter_title` varchar(255) DEFAULT NULL,
  `twitter_description` text,
  PRIMARY KEY (`article_id`),
  KEY `og_image_id` (`og_image_id`),
  KEY `twitter_image_id` (`twitter_image_id`),
  CONSTRAINT `article_social_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_social_ibfk_2` FOREIGN KEY (`og_image_id`) REFERENCES `media_library` (`id`) ON DELETE SET NULL,
  CONSTRAINT `article_social_ibfk_3` FOREIGN KEY (`twitter_image_id`) REFERENCES `media_library` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_tag_relations`
--

DROP TABLE IF EXISTS `article_tag_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_tag_relations` (
  `article_id` bigint NOT NULL,
  `tag_id` bigint NOT NULL,
  PRIMARY KEY (`article_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `article_tag_relations_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_tag_relations_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `article_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_tags`
--

DROP TABLE IF EXISTS `article_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_tags` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_topic_relations`
--

DROP TABLE IF EXISTS `article_topic_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_topic_relations` (
  `article_id` bigint NOT NULL,
  `topic_id` bigint NOT NULL,
  PRIMARY KEY (`article_id`,`topic_id`),
  KEY `topic_id` (`topic_id`),
  CONSTRAINT `article_topic_relations_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_topic_relations_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `article_topics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `article_topics`
--

DROP TABLE IF EXISTS `article_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `article_topics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text,
  `parent_id` bigint DEFAULT NULL,
  `product_category_id` bigint DEFAULT NULL,
  `featured_image_id` bigint DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `featured_image_id` (`featured_image_id`),
  KEY `idx_topics_slug` (`slug`),
  KEY `idx_topics_parent` (`parent_id`),
  CONSTRAINT `article_topics_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `article_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `article_topics_ibfk_2` FOREIGN KEY (`featured_image_id`) REFERENCES `media_library` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `articles`
--

DROP TABLE IF EXISTS `articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `excerpt` text,
  `author_id` bigint NOT NULL,
  `status` enum('draft','ready_to_publish','published') DEFAULT 'draft',
  `site_menu_display` enum('yes','no') DEFAULT 'no',
  `site_blog_display` enum('yes','no') DEFAULT 'yes',
  `menu_order` int DEFAULT '0',
  `page_type` enum('page','article','about','services','contact','help_article') DEFAULT 'article',
  `featured_image_id` bigint DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `author_id` (`author_id`),
  KEY `featured_image_id` (`featured_image_id`),
  KEY `idx_articles_slug` (`slug`),
  KEY `idx_articles_status` (`status`),
  KEY `idx_articles_published` (`published_at`),
  FULLTEXT KEY `idx_articles_search` (`title`,`content`,`excerpt`),
  CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `articles_ibfk_2` FOREIGN KEY (`featured_image_id`) REFERENCES `media_library` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_custom_events`
--

DROP TABLE IF EXISTS `artist_custom_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_custom_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_id` bigint NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `event_start_date` date NOT NULL,
  `event_end_date` date NOT NULL,
  `venue_name` varchar(255) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_artist_custom_events` (`artist_id`,`event_start_date`),
  CONSTRAINT `artist_custom_events_ibfk_1` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_jury_packets`
--

DROP TABLE IF EXISTS `artist_jury_packets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_jury_packets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_id` bigint NOT NULL,
  `packet_name` varchar(255) NOT NULL,
  `packet_data` json DEFAULT NULL COMMENT 'Standard field responses - artist_statement, portfolio_url, additional_info, field_responses',
  `photos_data` json DEFAULT NULL COMMENT 'Jury photo URLs and metadata',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `persona_id` bigint DEFAULT NULL COMMENT 'Optional persona this packet is associated with',
  PRIMARY KEY (`id`),
  KEY `idx_artist_packets` (`artist_id`),
  KEY `idx_persona_packets` (`persona_id`),
  CONSTRAINT `artist_jury_packets_ibfk_1` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `artist_jury_packets_ibfk_2` FOREIGN KEY (`persona_id`) REFERENCES `artist_personas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_personas`
--

DROP TABLE IF EXISTS `artist_personas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_personas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_id` bigint NOT NULL,
  `persona_name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL COMMENT 'Public display name for this persona',
  `bio` text COMMENT 'Bio/artist statement for this persona',
  `specialty` varchar(255) DEFAULT NULL COMMENT 'Art specialty/medium focus',
  `portfolio_url` varchar(500) DEFAULT NULL COMMENT 'Portfolio URL for this persona',
  `website_url` varchar(500) DEFAULT NULL COMMENT 'Personal website for this persona',
  `instagram_handle` varchar(100) DEFAULT NULL COMMENT 'Instagram without @ symbol',
  `facebook_url` varchar(500) DEFAULT NULL COMMENT 'Facebook page/profile URL',
  `profile_image_url` varchar(500) DEFAULT NULL COMMENT 'Profile image for this persona',
  `is_default` tinyint(1) DEFAULT '0' COMMENT 'Default persona for applications',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Active status',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_artist_personas` (`artist_id`),
  KEY `idx_active_personas` (`artist_id`,`is_active`),
  CONSTRAINT `artist_personas_ibfk_1` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_profiles`
--

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
  `custom_details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `customer_service_email` varchar(255) DEFAULT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `founding_date` date DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_artist_profiles_business` (`business_name`),
  FULLTEXT KEY `business_name` (`business_name`,`artist_biography`),
  CONSTRAINT `artist_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_verification_applications`
--

DROP TABLE IF EXISTS `artist_verification_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_verification_applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_id` bigint NOT NULL,
  `application_type` enum('initial','renewal') DEFAULT 'initial',
  `verification_level` enum('basic','premium') DEFAULT 'basic',
  `business_name` varchar(255) DEFAULT NULL COMMENT 'Official business/professional name',
  `years_experience` int DEFAULT NULL COMMENT 'Years of professional art experience',
  `art_education` text COMMENT 'Education background and credentials',
  `professional_achievements` text COMMENT 'Awards, exhibitions, recognition',
  `business_documentation` text COMMENT 'Business license, tax ID info',
  `portfolio_description` text COMMENT 'Description of work and artistic practice',
  `portfolio_images` json DEFAULT NULL COMMENT 'Array of portfolio image URLs',
  `exhibition_history` text COMMENT 'Past exhibitions and shows',
  `client_testimonials` text COMMENT 'Professional references and testimonials',
  `professional_website` varchar(500) DEFAULT NULL COMMENT 'Primary professional website',
  `social_media_links` json DEFAULT NULL COMMENT 'Professional social media accounts',
  `business_address` text COMMENT 'Business/studio address',
  `professional_phone` varchar(20) DEFAULT NULL COMMENT 'Professional contact number',
  `status` enum('draft','submitted','under_review','approved','rejected','revision_requested') DEFAULT 'draft',
  `reviewer_id` bigint DEFAULT NULL COMMENT 'Admin user reviewing the application',
  `reviewer_notes` text COMMENT 'Internal notes from reviewer',
  `revision_requested_notes` text COMMENT 'Notes for artist on what needs revision',
  `application_fee` decimal(8,2) DEFAULT '25.00' COMMENT 'Fee paid for verification application',
  `payment_status` enum('unpaid','pending','paid','refunded') DEFAULT 'unpaid',
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL COMMENT 'Stripe payment intent ID',
  `verification_expiry_date` date DEFAULT NULL COMMENT 'When verification expires',
  `verified_at` timestamp NULL DEFAULT NULL COMMENT 'When verification was approved',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitted_at` timestamp NULL DEFAULT NULL COMMENT 'When application was submitted',
  PRIMARY KEY (`id`),
  KEY `idx_artist_verification` (`artist_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reviewer` (`reviewer_id`),
  KEY `idx_verification_expiry` (`verification_expiry_date`),
  CONSTRAINT `artist_verification_applications_ibfk_1` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `artist_verification_applications_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist_verification_status`
--

DROP TABLE IF EXISTS `artist_verification_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artist_verification_status` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_id` bigint NOT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verification_level` enum('basic','premium') DEFAULT NULL,
  `verification_date` date DEFAULT NULL COMMENT 'Date when verification was granted',
  `expiry_date` date DEFAULT NULL COMMENT 'When verification expires',
  `renewal_reminder_sent` tinyint(1) DEFAULT '0',
  `verification_application_id` bigint DEFAULT NULL COMMENT 'Link to the application that granted verification',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `artist_id` (`artist_id`),
  KEY `verification_application_id` (`verification_application_id`),
  KEY `idx_verified_artists` (`is_verified`),
  KEY `idx_expiry_date` (`expiry_date`),
  CONSTRAINT `artist_verification_status_ibfk_1` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `artist_verification_status_ibfk_2` FOREIGN KEY (`verification_application_id`) REFERENCES `artist_verification_applications` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `automation_logs`
--

DROP TABLE IF EXISTS `automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `automation_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `automation_type` enum('event_generation','email_sent','template_applied') NOT NULL,
  `series_id` bigint DEFAULT NULL,
  `event_id` bigint DEFAULT NULL,
  `email_automation_rule_id` bigint DEFAULT NULL,
  `status` enum('success','failed','skipped') NOT NULL,
  `message` text,
  `execution_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `email_automation_rule_id` (`email_automation_rule_id`),
  KEY `idx_automation_status` (`status`,`execution_time`),
  KEY `idx_series_logs` (`series_id`),
  KEY `idx_automation_type` (`automation_type`),
  CONSTRAINT `automation_logs_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `event_series` (`id`) ON DELETE SET NULL,
  CONSTRAINT `automation_logs_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `automation_logs_ibfk_3` FOREIGN KEY (`email_automation_rule_id`) REFERENCES `email_automation_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bounce_tracking`
--

DROP TABLE IF EXISTS `bounce_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bounce_tracking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email_address` varchar(255) NOT NULL,
  `user_id` bigint DEFAULT NULL COMMENT 'User ID if applicable',
  `bounce_count` int NOT NULL DEFAULT '0',
  `last_bounce_date` timestamp NULL DEFAULT NULL,
  `bounce_type` enum('hard','soft') NOT NULL,
  `is_blacklisted` tinyint(1) NOT NULL DEFAULT '0',
  `last_error` varchar(500) DEFAULT NULL COMMENT 'Most recent bounce reason',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email_address`),
  KEY `idx_blacklisted` (`is_blacklisted`,`email_address`),
  KEY `idx_bounce_type` (`bounce_type`,`bounce_count`),
  KEY `idx_last_bounce` (`last_bounce_date` DESC),
  KEY `idx_bounce_user_status` (`user_id`,`is_blacklisted`,`bounce_count`),
  CONSTRAINT `bounce_tracking_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bounce detection and domain protection system';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cart_applied_coupons`
--

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

--
-- Table structure for table `cart_collections`
--

DROP TABLE IF EXISTS `cart_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_collections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_collections_user` (`user_id`),
  CONSTRAINT `cart_collections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cart_items`
--

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
  KEY `idx_cart_items_cart` (`cart_id`),
  KEY `idx_cart_items_product` (`product_id`),
  CONSTRAINT `fk_cart_items_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_vendor_id` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `guest_token` varchar(255) DEFAULT NULL,
  `source_site_api_key` varchar(255) DEFAULT NULL,
  `source_site_name` varchar(255) DEFAULT NULL,
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
  KEY `idx_carts_user` (`user_id`),
  KEY `idx_carts_guest` (`guest_token`),
  KEY `idx_carts_source_api_key` (`source_site_api_key`),
  CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category_change_log`
--

DROP TABLE IF EXISTS `category_change_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_change_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` bigint DEFAULT NULL,
  `action` enum('create','update','delete') NOT NULL,
  `before_json` json DEFAULT NULL,
  `after_json` json DEFAULT NULL,
  `changed_by` bigint DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category_content`
--

DROP TABLE IF EXISTS `category_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_content` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `hero_image` varchar(255) DEFAULT NULL,
  `description` text,
  `banner` varchar(255) DEFAULT NULL,
  `featured_products` text,
  `featured_artists` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_content_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `category_seo`
--

DROP TABLE IF EXISTS `category_seo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_seo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(512) DEFAULT NULL,
  `meta_keywords` varchar(512) DEFAULT NULL,
  `canonical_url` varchar(255) DEFAULT NULL,
  `json_ld` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_seo_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `community_profiles`
--

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
  `wishlist` json DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `community_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `coupons`
--

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

--
-- Table structure for table `csv_upload_errors`
--

DROP TABLE IF EXISTS `csv_upload_errors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `csv_upload_errors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `row_num` int DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `raw_data` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_id` (`job_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `csv_upload_jobs`
--

DROP TABLE IF EXISTS `csv_upload_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `csv_upload_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `job_type` enum('inventory_upload','user_upload','product_upload','event_upload') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_rows` int DEFAULT '0',
  `processed_rows` int DEFAULT '0',
  `failed_rows` int DEFAULT '0',
  `error_summary` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `user_jwt` text COLLATE utf8mb4_unicode_ci,
  `user_refresh_token` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_id` (`job_id`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_job_id` (`job_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dashboard_layouts`
--

DROP TABLE IF EXISTS `dashboard_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_layouts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `widget_type` varchar(50) NOT NULL,
  `grid_row` int NOT NULL,
  `grid_col` int NOT NULL,
  `widget_config` json DEFAULT NULL,
  `is_admin_locked` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_position` (`user_id`,`grid_row`,`grid_col`),
  KEY `idx_user_layout` (`user_id`),
  KEY `idx_widget_type` (`widget_type`),
  KEY `idx_admin_locked` (`is_admin_locked`),
  CONSTRAINT `dashboard_layouts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dashboard_widget_types`
--

DROP TABLE IF EXISTS `dashboard_widget_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_widget_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `widget_type` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `category` varchar(50) DEFAULT NULL,
  `required_permission` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `default_config` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `widget_type` (`widget_type`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_automation_rules`
--

DROP TABLE IF EXISTS `email_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_automation_rules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `series_id` bigint DEFAULT NULL,
  `template_id` bigint DEFAULT NULL,
  `trigger_type` enum('renewal_reminder','event_created','deadline_approach','series_complete') NOT NULL,
  `trigger_offset_days` int DEFAULT '0',
  `target_audience` enum('artists','promoters','attendees','all') DEFAULT 'artists',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_automation_triggers` (`trigger_type`,`is_active`),
  KEY `idx_series_automation` (`series_id`),
  CONSTRAINT `email_automation_rules_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `event_series` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_log`
--

DROP TABLE IF EXISTS `email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `email_address` varchar(255) NOT NULL COMMENT 'Actual email sent to',
  `template_id` bigint NOT NULL,
  `subject` varchar(255) NOT NULL COMMENT 'Rendered subject line',
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','failed','bounced') NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '1' COMMENT 'Send attempt number',
  `error_message` varchar(500) DEFAULT NULL COMMENT 'User-friendly error message',
  `smtp_response` text COMMENT 'Raw SMTP response for debugging',
  PRIMARY KEY (`id`),
  KEY `idx_user_log` (`user_id`,`sent_at` DESC),
  KEY `idx_email_status` (`email_address`,`status`),
  KEY `idx_template_log` (`template_id`,`sent_at` DESC),
  KEY `idx_status_attempts` (`status`,`attempt_count`),
  KEY `idx_log_user_template` (`user_id`,`template_id`,`sent_at` DESC),
  CONSTRAINT `email_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_log_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `email_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Complete audit trail of all email send attempts';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_queue`
--

DROP TABLE IF EXISTS `email_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_queue` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `priority` tinyint NOT NULL DEFAULT '3' COMMENT '1=highest, 5=lowest',
  `data` json NOT NULL COMMENT 'Template variable data',
  `scheduled_for` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When to send (for frequency batching)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','processing','sent','failed') DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_queue_processing` (`status`,`priority`,`scheduled_for`),
  KEY `idx_user_queue` (`user_id`,`status`),
  KEY `idx_priority_schedule` (`priority`,`scheduled_for`),
  KEY `idx_queue_user_priority` (`user_id`,`priority`,`scheduled_for`),
  CONSTRAINT `email_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Priority-based email queue with dynamic reordering';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) NOT NULL COMMENT 'e.g., order_confirmation, product_update',
  `name` varchar(255) NOT NULL COMMENT 'Human-readable name',
  `priority_level` tinyint NOT NULL DEFAULT '3' COMMENT 'Default priority 1-5',
  `can_compile` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Can be batched in digest emails',
  `is_transactional` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Bypass user frequency settings',
  `subject_template` text NOT NULL COMMENT 'Subject line template with variables',
  `body_template` text NOT NULL COMMENT 'Email body template with variables',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_key` (`template_key`),
  KEY `idx_template_key` (`template_key`),
  KEY `idx_transactional` (`is_transactional`),
  KEY `idx_priority` (`priority_level`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Hardcoded system email templates with priority and compilation rules';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_tracking`
--

DROP TABLE IF EXISTS `email_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_tracking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email_log_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `event_type` enum('sent','delivered','bounced','opened','clicked') NOT NULL,
  `event_data` json DEFAULT NULL COMMENT 'Event-specific details',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_events` (`email_log_id`,`event_type`),
  KEY `idx_user_tracking` (`user_id`,`created_at` DESC),
  KEY `idx_event_type` (`event_type`,`created_at` DESC),
  KEY `idx_tracking_email_user` (`email_address`,`user_id`,`event_type`),
  CONSTRAINT `email_tracking_ibfk_1` FOREIGN KEY (`email_log_id`) REFERENCES `email_log` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_tracking_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Email delivery and engagement event tracking';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `error_logs`
--

DROP TABLE IF EXISTS `error_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `error_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `error_message` text NOT NULL,
  `stack` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_application_fields`
--

DROP TABLE IF EXISTS `event_application_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_application_fields` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `field_type` enum('text','image','video') NOT NULL,
  `field_name` varchar(255) NOT NULL,
  `field_description` text,
  `is_required` tinyint(1) DEFAULT '0',
  `verified_can_skip` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_fields` (`event_id`,`display_order`),
  CONSTRAINT `event_application_fields_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_applications`
--

DROP TABLE IF EXISTS `event_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `artist_id` bigint NOT NULL,
  `status` enum('draft','submitted','under_review','accepted','rejected','declined','confirmed','waitlisted') DEFAULT 'draft',
  `artist_statement` text,
  `portfolio_url` varchar(255) DEFAULT NULL,
  `booth_preferences` json DEFAULT NULL,
  `additional_info` text,
  `additional_notes` text,
  `application_fee_paid` tinyint(1) DEFAULT '0',
  `jury_fee_paid` tinyint(1) DEFAULT '0',
  `payment_transaction_id` varchar(255) DEFAULT NULL,
  `jury_score` decimal(5,2) DEFAULT NULL,
  `jury_comments` text,
  `jury_reviewed_by` bigint DEFAULT NULL,
  `jury_reviewed_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `booth_fee_amount` decimal(10,2) DEFAULT '0.00',
  `booth_fee_paid` tinyint(1) DEFAULT '0',
  `booth_fee_due_date` datetime DEFAULT NULL,
  `due_date_timezone` varchar(50) DEFAULT NULL,
  `reminder_sent_at` datetime DEFAULT NULL,
  `final_notice_sent_at` datetime DEFAULT NULL,
  `auto_declined_at` datetime DEFAULT NULL,
  `decline_reason` enum('no_payment','manual','other') DEFAULT NULL,
  `payment_grace_period_hours` int DEFAULT '0',
  `persona_id` bigint DEFAULT NULL COMMENT 'Persona used for this application',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_artist_persona` (`event_id`,`artist_id`,`persona_id`),
  KEY `artist_id` (`artist_id`),
  KEY `jury_reviewed_by` (`jury_reviewed_by`),
  KEY `idx_booth_fee_due_date` (`booth_fee_due_date`),
  KEY `idx_booth_fee_status` (`booth_fee_paid`,`booth_fee_due_date`),
  KEY `idx_persona_applications` (`persona_id`),
  CONSTRAINT `event_applications_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_applications_ibfk_2` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_applications_ibfk_3` FOREIGN KEY (`jury_reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `event_applications_ibfk_4` FOREIGN KEY (`persona_id`) REFERENCES `artist_personas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_artists`
--

DROP TABLE IF EXISTS `event_artists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_artists` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `artist_id` bigint NOT NULL,
  `status` enum('invited','confirmed','declined','applied','accepted','waitlisted') DEFAULT 'invited',
  `application_method` enum('system','manual') DEFAULT 'system',
  `application_id` bigint DEFAULT NULL,
  `application_notes` text,
  `jury_score` decimal(5,2) DEFAULT NULL,
  `jury_comments` text,
  `added_by` bigint NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_artist` (`event_id`,`artist_id`),
  KEY `artist_id` (`artist_id`),
  KEY `application_id` (`application_id`),
  KEY `added_by` (`added_by`),
  CONSTRAINT `event_artists_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_artists_ibfk_2` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_artists_ibfk_3` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE SET NULL,
  CONSTRAINT `event_artists_ibfk_4` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_available_addons`
--

DROP TABLE IF EXISTS `event_available_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_available_addons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `addon_name` varchar(100) NOT NULL,
  `addon_description` text,
  `addon_price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_addons` (`event_id`,`is_active`,`display_order`),
  CONSTRAINT `event_available_addons_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_booth_addons`
--

DROP TABLE IF EXISTS `event_booth_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_booth_addons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `addon_type` varchar(100) NOT NULL,
  `description` text,
  `amount` decimal(10,2) NOT NULL,
  `selected` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `event_booth_addons_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_booth_fees`
--

DROP TABLE IF EXISTS `event_booth_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_booth_fees` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `due_date` datetime NOT NULL,
  `due_date_timezone` varchar(50) NOT NULL,
  `payment_intent_id` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `idx_payment_intent` (`payment_intent_id`),
  CONSTRAINT `event_booth_fees_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_booth_payments`
--

DROP TABLE IF EXISTS `event_booth_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_booth_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_date` datetime NOT NULL,
  `stripe_payment_intent_id` varchar(255) NOT NULL,
  `payment_method` enum('stripe','external') DEFAULT 'stripe',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `idx_stripe_payment_intent` (`stripe_payment_intent_id`),
  CONSTRAINT `event_booth_payments_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_categories`
--

DROP TABLE IF EXISTS `event_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_categories` (
  `event_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  PRIMARY KEY (`event_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `event_categories_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_images`
--

DROP TABLE IF EXISTS `event_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `friendly_name` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `alt_text` varchar(255) DEFAULT NULL,
  `order_index` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_event_images` (`event_id`,`order_index`),
  CONSTRAINT `event_images_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_notifications`
--

DROP TABLE IF EXISTS `event_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `notification_type` enum('renewal_reminder','application_deadline','jury_date','event_reminder','artist_invitation') NOT NULL,
  `recipient_id` bigint NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT NULL,
  `delivery_status` enum('pending','sent','delivered','failed') DEFAULT 'pending',
  `email_subject` varchar(255) DEFAULT NULL,
  `email_body` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `recipient_id` (`recipient_id`),
  KEY `idx_notification_tracking` (`event_id`,`notification_type`,`delivery_status`),
  CONSTRAINT `event_notifications_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_notifications_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_series`
--

DROP TABLE IF EXISTS `event_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_series` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `series_name` varchar(255) NOT NULL,
  `series_description` text,
  `promoter_id` bigint NOT NULL,
  `recurrence_pattern` enum('yearly','monthly','quarterly','custom') NOT NULL,
  `recurrence_interval` int DEFAULT '1',
  `series_status` enum('active','paused','completed','cancelled') DEFAULT 'active',
  `template_event_id` bigint DEFAULT NULL,
  `auto_generate` tinyint(1) DEFAULT '1',
  `generate_months_ahead` int DEFAULT '12',
  `series_start_date` date NOT NULL,
  `series_end_date` date DEFAULT NULL,
  `next_generation_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_event_id` (`template_event_id`),
  KEY `idx_promoter_series` (`promoter_id`),
  KEY `idx_auto_generate` (`auto_generate`,`next_generation_date`),
  KEY `idx_series_status` (`series_status`),
  CONSTRAINT `event_series_ibfk_1` FOREIGN KEY (`promoter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_series_ibfk_2` FOREIGN KEY (`template_event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_templates`
--

DROP TABLE IF EXISTS `event_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `promoter_id` bigint NOT NULL,
  `template_config` json NOT NULL,
  `description` text,
  `is_public` tinyint(1) DEFAULT '0',
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promoter_templates` (`promoter_id`),
  KEY `idx_public_templates` (`is_public`),
  CONSTRAINT `event_templates_ibfk_1` FOREIGN KEY (`promoter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_tickets`
--

DROP TABLE IF EXISTS `event_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_tickets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `ticket_type` varchar(100) NOT NULL DEFAULT 'General Admission',
  `price` decimal(10,2) NOT NULL,
  `quantity_available` int DEFAULT NULL,
  `quantity_sold` int DEFAULT '0',
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_tickets_event` (`event_id`),
  CONSTRAINT `event_tickets_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_types`
--

DROP TABLE IF EXISTS `event_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promoter_id` bigint NOT NULL,
  `event_type_id` int NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `series_id` bigint DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `short_description` text,
  `event_status` enum('draft','active','archived') DEFAULT 'draft',
  `application_status` enum('not_accepting','accepting','closed','jurying','artists_announced','event_completed') DEFAULT 'not_accepting',
  `allow_applications` tinyint(1) DEFAULT '0',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `application_deadline` date DEFAULT NULL,
  `jury_date` date DEFAULT NULL,
  `notification_date` date DEFAULT NULL,
  `venue_name` varchar(255) DEFAULT NULL,
  `venue_address` varchar(255) DEFAULT NULL,
  `venue_city` varchar(100) DEFAULT NULL,
  `venue_state` varchar(100) DEFAULT NULL,
  `venue_zip` varchar(20) DEFAULT NULL,
  `venue_country` varchar(100) DEFAULT 'USA',
  `venue_capacity` int DEFAULT NULL,
  `age_restrictions` varchar(50) DEFAULT 'all_ages',
  `age_minimum` int DEFAULT NULL,
  `dress_code` text,
  `has_rsvp` tinyint(1) DEFAULT '0',
  `has_tickets` tinyint(1) DEFAULT '0',
  `rsvp_url` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `parking_info` text,
  `accessibility_info` text,
  `admission_fee` decimal(10,2) DEFAULT '0.00',
  `parking_fee` decimal(10,2) DEFAULT '0.00',
  `parking_details` text,
  `application_fee` decimal(10,2) DEFAULT '0.00',
  `jury_fee` decimal(10,2) DEFAULT '0.00',
  `booth_fee` decimal(10,2) DEFAULT '0.00',
  `max_artists` int DEFAULT NULL,
  `max_applications` int DEFAULT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `event_keywords` text,
  `event_schema` json DEFAULT NULL,
  `event_tags` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `promoter_id` (`promoter_id`),
  KEY `event_type_id` (`event_type_id`),
  KEY `parent_id` (`parent_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`promoter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`event_type_id`) REFERENCES `event_types` (`id`),
  CONSTRAINT `events_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `events_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `financial_settings`
--

DROP TABLE IF EXISTS `financial_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financial_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `user_type` enum('artist','promoter') NOT NULL,
  `fee_structure` enum('commission','passthrough') DEFAULT 'commission',
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `effective_date` date DEFAULT (curdate()),
  `created_by` bigint NOT NULL,
  `updated_by` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_fee_structure` (`fee_structure`),
  KEY `idx_active` (`is_active`),
  KEY `idx_user_active` (`user_id`,`is_active`),
  CONSTRAINT `financial_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `financial_settings_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `financial_settings_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_history`
--

DROP TABLE IF EXISTS `inventory_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `change_type` enum('manual_adjustment','sale','restock','return','initial_stock','damage','system_correction') NOT NULL,
  `previous_qty` int NOT NULL,
  `new_qty` int NOT NULL,
  `change_amount` int GENERATED ALWAYS AS ((`new_qty` - `previous_qty`)) STORED,
  `reason` text,
  `reference_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_change_type` (`change_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `created_by` (`created_by`),
  KEY `idx_external_source` (`created_at`),
  CONSTRAINT `inventory_history_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_history_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `manual_adjustments`
--

DROP TABLE IF EXISTS `manual_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manual_adjustments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `admin_id` bigint NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason_code` varchar(50) NOT NULL,
  `internal_notes` text,
  `vendor_visible_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_adjustments` (`vendor_id`),
  KEY `idx_admin_adjustments` (`admin_id`),
  KEY `idx_reason_code` (`reason_code`),
  CONSTRAINT `manual_adjustments_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `manual_adjustments_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `media_library`
--

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

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `vendor_id` bigint NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL,
  `shipping_cost` decimal(10,2) DEFAULT '0.00',
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_vendor` (`order_id`,`vendor_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_vendor` (`vendor_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','paid','accepted','shipped','cancelled','refunded') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL,
  `shipping_amount` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `platform_fee_amount` decimal(10,2) DEFAULT '0.00',
  `currency` varchar(3) DEFAULT 'USD',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stripe_payment_intent` (`stripe_payment_intent_id`),
  KEY `idx_user_orders` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_receipts`
--

DROP TABLE IF EXISTS `payment_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_receipts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `receipt_url` varchar(255) NOT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `payment_receipts_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pending_images`
--

DROP TABLE IF EXISTS `pending_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pending_images` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `permanent_url` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','processed','complete','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pending_images_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permission_restrictions`
--

DROP TABLE IF EXISTS `permission_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permission_restrictions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `permission_name` varchar(50) NOT NULL,
  `allowed_user_types` json NOT NULL COMMENT 'Array of user types allowed to have this permission',
  `description` text COMMENT 'Human readable description of the permission',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission` (`permission_name`),
  KEY `idx_permission_name` (`permission_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_categories`
--

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

--
-- Table structure for table `product_images`
--

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
  `category` enum('lifestyle','product','detail','variation') DEFAULT 'product',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_images_category` (`product_id`,`category`,`order`),
  CONSTRAINT `fk_pi_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_inventory`
--

DROP TABLE IF EXISTS `product_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_inventory` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `qty_on_hand` int NOT NULL DEFAULT '0',
  `qty_on_order` int NOT NULL DEFAULT '0',
  `qty_available` int GENERATED ALWAYS AS ((`qty_on_hand` - `qty_on_order`)) STORED,
  `reorder_qty` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_inventory` (`product_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_qty_available` (`qty_available`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `product_inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_inventory_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_shipping`
--

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
) ENGINE=InnoDB AUTO_INCREMENT=226 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_variations`
--

DROP TABLE IF EXISTS `product_variations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `variation_type_id` bigint NOT NULL,
  `variation_value_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_variation` (`product_id`,`variation_type_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_variation_type` (`variation_type_id`),
  KEY `idx_variation_value` (`variation_value_id`),
  CONSTRAINT `product_variations_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variations_ibfk_2` FOREIGN KEY (`variation_type_id`) REFERENCES `user_variation_types` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variations_ibfk_3` FOREIGN KEY (`variation_value_id`) REFERENCES `user_variation_values` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=174 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

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
  `track_inventory` tinyint(1) DEFAULT '1',
  `category_id` bigint NOT NULL DEFAULT '1',
  `sku` varchar(50) NOT NULL DEFAULT 'SKU-DEFAULT',
  `status` enum('draft','active','deleted','hidden','terminated') DEFAULT 'draft',
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
  `product_type` enum('simple','variable','variant') DEFAULT 'simple',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_sku` (`sku`),
  UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),
  KEY `fk_products_category_id` (`category_id`),
  KEY `fk_products_parent_id` (`parent_id`),
  KEY `fk_products_created_by` (`created_by`),
  KEY `fk_products_updated_by` (`updated_by`),
  KEY `idx_search_active` (`status`,`created_at`),
  KEY `idx_vendor_status` (`vendor_id`,`status`),
  FULLTEXT KEY `name` (`name`,`description`),
  FULLTEXT KEY `name_2` (`name`,`description`,`sku`),
  CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_parent_id` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2000000407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `promoter_profiles`
--

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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `legal_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `founding_date` date DEFAULT NULL,
  `organization_size` varchar(50) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `upcoming_events` TEXT DEFAULT NULL,
  `sponsorship_options` TEXT DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_promoter_profiles_business` (`business_name`),
  FULLTEXT KEY `business_name` (`business_name`),
  CONSTRAINT `promoter_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `device_info` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=457 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `return_policies`
--

DROP TABLE IF EXISTS `return_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_policies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `policy_text` text NOT NULL,
  `status` enum('active','archived') DEFAULT 'active',
  `created_by` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_return_policies_user_id` (`user_id`),
  KEY `idx_return_policies_status` (`status`),
  KEY `idx_return_policies_created_by` (`created_by`),
  CONSTRAINT `fk_return_policies_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_return_policies_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales`
--

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

--
-- Table structure for table `saved_items`
--

DROP TABLE IF EXISTS `saved_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `saved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `collection_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_saved_items_user` (`user_id`),
  CONSTRAINT `saved_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `saved_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schema_company_data`
--

DROP TABLE IF EXISTS `schema_company_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_company_data` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `social_profiles` json DEFAULT NULL,
  `contact_info` json DEFAULT NULL,
  `address_info` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `search_config`
--

DROP TABLE IF EXISTS `search_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `search_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) DEFAULT NULL,
  `weight_multipliers` json DEFAULT NULL,
  `boost_factors` json DEFAULT NULL,
  `filter_options` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `search_queries`
--

DROP TABLE IF EXISTS `search_queries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `search_queries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `query_text` varchar(500) DEFAULT NULL,
  `category_filter` varchar(50) DEFAULT NULL,
  `result_count` int DEFAULT NULL,
  `clicked_result_id` int DEFAULT NULL,
  `clicked_result_type` enum('product','artist','promoter','show','content') DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `response_time_ms` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_query_analysis` (`query_text`,`created_at`),
  KEY `idx_user_search_history` (`user_id`,`created_at`),
  KEY `idx_popular_searches` (`query_text`,`result_count`),
  CONSTRAINT `search_queries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `series_configuration_templates`
--

DROP TABLE IF EXISTS `series_configuration_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `series_configuration_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `recurrence_pattern` enum('yearly','monthly','quarterly','custom') NOT NULL,
  `recurrence_interval` int DEFAULT '1',
  `default_config` json DEFAULT NULL,
  `is_system_template` tinyint(1) DEFAULT '0',
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `series_events`
--

DROP TABLE IF EXISTS `series_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `series_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `series_id` bigint NOT NULL,
  `event_id` bigint NOT NULL,
  `sequence_number` int NOT NULL,
  `generated_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `generation_method` enum('manual','auto','cloned') DEFAULT 'auto',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_series_sequence` (`series_id`,`sequence_number`),
  KEY `event_id` (`event_id`),
  KEY `idx_series_events` (`series_id`),
  CONSTRAINT `series_events_ibfk_1` FOREIGN KEY (`series_id`) REFERENCES `event_series` (`id`) ON DELETE CASCADE,
  CONSTRAINT `series_events_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipping_policies`
--

DROP TABLE IF EXISTS `shipping_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_policies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `policy_text` text NOT NULL,
  `status` enum('active','archived') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_shipping_policy` (`user_id`,`status`),
  KEY `created_by` (`created_by`),
  KEY `idx_user_active_policy` (`user_id`,`status`),
  CONSTRAINT `shipping_policies_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_policies_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sites`
--

DROP TABLE IF EXISTS `sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sites` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `site_name` varchar(255) NOT NULL,
  `subdomain` varchar(100) NOT NULL,
  `custom_domain` varchar(255) DEFAULT NULL,
  `theme_name` varchar(100) NOT NULL DEFAULT 'default',
  `template_id` bigint DEFAULT '1',
  `status` enum('draft','active','inactive','suspended','suspended_violation','suspended_finance','deleted') DEFAULT 'draft',
  `site_title` varchar(255) DEFAULT NULL,
  `site_description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `domain_validation_key` varchar(64) DEFAULT NULL COMMENT 'Unique key for DNS TXT record validation',
  `domain_validation_status` enum('pending','verified','failed','expired') DEFAULT 'pending' COMMENT 'Status of domain validation process',
  `domain_validation_expires` timestamp NULL DEFAULT NULL COMMENT 'When the domain validation expires',
  `custom_domain_active` tinyint(1) DEFAULT '0' COMMENT 'Whether custom domain is active and verified',
  `domain_validation_attempted_at` timestamp NULL DEFAULT NULL COMMENT 'Last time domain validation was attempted',
  `domain_validation_error` text COMMENT 'Error message if domain validation failed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `subdomain` (`subdomain`),
  UNIQUE KEY `idx_sites_domain_validation_key` (`domain_validation_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_subdomain` (`subdomain`),
  KEY `idx_custom_domain` (`custom_domain`),
  KEY `idx_status` (`status`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_sites_custom_domain_active` (`custom_domain_active`),
  KEY `idx_sites_domain_validation_status` (`domain_validation_status`),
  CONSTRAINT `sites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `website_templates`
--

DROP TABLE IF EXISTS `website_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `website_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_name` varchar(100) NOT NULL,
  `template_slug` varchar(100) NOT NULL,
  `description` text,
  `css_file_path` varchar(500) NOT NULL,
  `preview_image_url` varchar(500) DEFAULT NULL,
  `tier_required` enum('free','basic','pro','premium') DEFAULT 'free',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_slug` (`template_slug`),
  KEY `idx_tier_required` (`tier_required`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `subscription_type` enum('website','shipping_labels','verification') NOT NULL,
  `discount_code` varchar(100) NOT NULL,
  `discount_type` enum('percentage','fixed_amount','free_months','free_addon') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `priority` int NOT NULL DEFAULT '10',
  `can_stack` tinyint(1) DEFAULT '1',
  `can_chain` tinyint(1) DEFAULT '0',
  `valid_from` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `valid_until` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_subscription` (`user_id`,`subscription_type`),
  KEY `idx_discount_code` (`discount_code`),
  KEY `idx_priority` (`priority`),
  KEY `idx_active_dates` (`is_active`,`valid_from`,`valid_until`),
  KEY `idx_stacking` (`can_stack`,`can_chain`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `discounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `discounts_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stripe_rates`
--

DROP TABLE IF EXISTS `stripe_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stripe_rates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rate_type` varchar(50) NOT NULL,
  `rate_name` varchar(100) NOT NULL,
  `percentage_rate` decimal(5,4) NOT NULL,
  `fixed_fee` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `region` varchar(10) DEFAULT 'US',
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rate_type_active` (`rate_type`,`is_active`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_currency_region` (`currency`,`region`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stripe_tax_transactions`
--

DROP TABLE IF EXISTS `stripe_tax_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stripe_tax_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `stripe_tax_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `customer_state` varchar(2) DEFAULT NULL,
  `customer_zip` varchar(10) DEFAULT NULL,
  `taxable_amount` decimal(10,2) DEFAULT NULL,
  `tax_collected` decimal(10,2) DEFAULT NULL,
  `tax_rate_used` decimal(5,4) DEFAULT NULL,
  `tax_breakdown` json DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_stripe_payment_intent` (`stripe_payment_intent_id`),
  KEY `idx_customer_state` (`customer_state`),
  KEY `idx_order_date` (`order_date`),
  CONSTRAINT `stripe_tax_transactions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_tax_summary`
--

DROP TABLE IF EXISTS `order_tax_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_tax_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `stripe_tax_transaction_id` bigint NOT NULL,
  `customer_state` varchar(2) NOT NULL,
  `customer_zip` varchar(10) NOT NULL,
  `taxable_amount` decimal(10,2) NOT NULL,
  `tax_collected` decimal(10,2) NOT NULL,
  `tax_rate_used` decimal(5,4) NOT NULL,
  `tax_jurisdiction` varchar(100) NOT NULL,
  `order_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_customer_state` (`customer_state`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_tax_jurisdiction` (`tax_jurisdiction`),
  CONSTRAINT `order_tax_summary_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_tax_summary_ibfk_2` FOREIGN KEY (`stripe_tax_transaction_id`) REFERENCES `stripe_tax_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscription_items`
--

DROP TABLE IF EXISTS `subscription_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint NOT NULL,
  `stripe_price_id` varchar(255) NOT NULL,
  `item_type` enum('verification_base','verification_persona') NOT NULL,
  `quantity` int DEFAULT '1',
  `persona_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_items` (`subscription_id`),
  KEY `idx_item_type` (`item_type`),
  KEY `idx_persona_subscription` (`persona_id`,`subscription_id`),
  CONSTRAINT `subscription_items_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `user_subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscription_items_ibfk_2` FOREIGN KEY (`persona_id`) REFERENCES `artist_personas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subscription_payments`
--

DROP TABLE IF EXISTS `subscription_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint NOT NULL,
  `stripe_invoice_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `status` enum('succeeded','pending','failed','refunded') DEFAULT 'pending',
  `payment_method` enum('card','connect_balance','other') DEFAULT 'card',
  `connect_transfer_id` varchar(255) DEFAULT NULL,
  `billing_period_start` timestamp NULL DEFAULT NULL,
  `billing_period_end` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_payments` (`subscription_id`),
  KEY `idx_stripe_invoice` (`stripe_invoice_id`),
  KEY `idx_payment_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `subscription_payments_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `user_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipping_label_purchases`
--

DROP TABLE IF EXISTS `shipping_label_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_label_purchases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint NOT NULL,
  `shipping_label_id` bigint NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','succeeded','failed') DEFAULT 'pending',
  `decline_reason` varchar(255) DEFAULT NULL,
  `payment_method` enum('card','connect_balance') DEFAULT 'card',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_id` (`subscription_id`),
  KEY `idx_shipping_label_id` (`shipping_label_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_status` (`status`),
  CONSTRAINT `shipping_label_purchases_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `user_subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_label_purchases_ibfk_2` FOREIGN KEY (`shipping_label_id`) REFERENCES `shipping_labels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipping_labels`
--

DROP TABLE IF EXISTS `shipping_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_labels` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `order_item_id` bigint NOT NULL,
  `vendor_id` bigint NOT NULL,
  `package_sequence` int NOT NULL DEFAULT '1',
  `carrier` enum('ups','fedex','usps') NOT NULL,
  `service_code` varchar(50) NOT NULL,
  `service_name` varchar(100) NOT NULL,
  `tracking_number` varchar(100) NOT NULL,
  `label_file_path` varchar(500) DEFAULT NULL,
  `label_format` enum('paper','label') NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `vendor_transaction_id` bigint DEFAULT NULL,
  `status` enum('purchased','printed','voided') DEFAULT 'purchased',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_item_id` (`order_item_id`),
  KEY `vendor_transaction_id` (`vendor_transaction_id`),
  KEY `idx_vendor_labels` (`vendor_id`,`created_at`),
  KEY `idx_label_tracking` (`tracking_number`),
  KEY `idx_order_labels` (`order_id`,`package_sequence`),
  KEY `idx_file_cleanup` (`created_at`,`label_file_path`),
  CONSTRAINT `shipping_labels_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_labels_ibfk_2` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_labels_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipping_labels_ibfk_4` FOREIGN KEY (`vendor_transaction_id`) REFERENCES `vendor_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `standalone_shipping_labels`
--

DROP TABLE IF EXISTS `standalone_shipping_labels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `standalone_shipping_labels` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `label_id` varchar(100) NOT NULL,
  `user_id` bigint NOT NULL,
  `carrier` enum('ups','fedex','usps') NOT NULL,
  `service_code` varchar(50) NOT NULL,
  `service_name` varchar(100) NOT NULL,
  `tracking_number` varchar(100) NOT NULL,
  `label_file_path` varchar(500) DEFAULT NULL,
  `label_format` enum('paper','label') NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `status` enum('purchased','printed','voided') DEFAULT 'purchased',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `label_id` (`label_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_label_id` (`label_id`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `standalone_shipping_labels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `terms_versions`
--

DROP TABLE IF EXISTS `terms_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terms_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `version` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_current` (`is_current`),
  KEY `idx_version` (`version`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `terms_versions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_purchases`
--

DROP TABLE IF EXISTS `ticket_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_purchases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  `buyer_email` varchar(255) NOT NULL,
  `buyer_name` varchar(255) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `unique_code` varchar(50) NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `purchase_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','confirmed','used','refunded') DEFAULT 'pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_code` (`unique_code`),
  KEY `idx_ticket_purchases_event` (`event_id`),
  KEY `idx_ticket_purchases_ticket` (`ticket_id`),
  KEY `idx_ticket_purchases_email` (`buyer_email`),
  KEY `idx_ticket_purchases_code` (`unique_code`),
  CONSTRAINT `ticket_purchases_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_purchases_ibfk_2` FOREIGN KEY (`ticket_id`) REFERENCES `event_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `topic_restrictions`
--

DROP TABLE IF EXISTS `topic_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topic_restrictions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `topic_id` bigint NOT NULL,
  `restriction_type` enum('user_type','permission','specific_user') NOT NULL,
  `restriction_value` varchar(255) NOT NULL,
  `logic_operator` enum('any_of','must_meet_all') DEFAULT 'any_of',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_topic_restriction` (`topic_id`,`restriction_type`,`restriction_value`),
  KEY `idx_topic_restrictions_topic` (`topic_id`),
  KEY `idx_topic_restrictions_type` (`restriction_type`),
  CONSTRAINT `topic_restrictions_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `article_topics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_acknowledgments`
--

DROP TABLE IF EXISTS `user_acknowledgments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_acknowledgments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `announcement_id` int NOT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `remind_later_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_announcement` (`user_id`,`announcement_id`),
  KEY `announcement_id` (`announcement_id`),
  KEY `idx_user_announcement` (`user_id`,`announcement_id`),
  KEY `idx_acknowledged` (`acknowledged_at`),
  CONSTRAINT `user_acknowledgments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_acknowledgments_ibfk_2` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_categories`
--

DROP TABLE IF EXISTS `user_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `description` text,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_category` (`user_id`,`name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `user_categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_categories_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `user_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_email_preference_log`
--

DROP TABLE IF EXISTS `user_email_preference_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_email_preference_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'User whose preferences changed',
  `changed_by_user_id` bigint DEFAULT NULL COMMENT 'User who made the change (null if admin)',
  `changed_by_admin` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Was changed by admin',
  `old_preferences` json NOT NULL COMMENT 'Previous preferences snapshot',
  `new_preferences` json NOT NULL COMMENT 'Updated preferences snapshot',
  `change_reason` varchar(255) DEFAULT NULL COMMENT 'Optional reason for change',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_changes` (`user_id`,`created_at` DESC),
  KEY `idx_admin_changes` (`changed_by_admin`,`created_at` DESC),
  KEY `idx_change_by` (`changed_by_user_id`,`created_at` DESC),
  CONSTRAINT `user_email_preference_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_email_preference_log_ibfk_2` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Complete audit trail of all preference changes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_email_preferences`
--

DROP TABLE IF EXISTS `user_email_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_email_preferences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `frequency` enum('live','hourly','daily','weekly') NOT NULL DEFAULT 'live',
  `categories` json DEFAULT NULL COMMENT 'Enabled/disabled email categories',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Master email toggle',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_prefs` (`user_id`),
  KEY `idx_frequency` (`frequency`),
  KEY `idx_enabled` (`is_enabled`),
  KEY `idx_prefs_user_enabled` (`user_id`,`is_enabled`),
  CONSTRAINT `user_email_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User-controlled email frequency and category settings';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_logins`
--

DROP TABLE IF EXISTS `user_logins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logins` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` enum('google','email') NOT NULL,
  `provider_id` varchar(255) NOT NULL,
  `provider_token` text NOT NULL,
  `api_prefix` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider` (`provider`,`provider_id`),
  KEY `idx_user_logins_user_id` (`user_id`),
  CONSTRAINT `user_logins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `user_id` bigint NOT NULL,
  `vendor` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_articles` tinyint(1) DEFAULT '0',
  `publish_articles` tinyint(1) DEFAULT '0',
  `manage_articles_seo` tinyint(1) DEFAULT '0',
  `manage_articles_topics` tinyint(1) DEFAULT '0',
  `manage_sites` tinyint(1) DEFAULT '0' COMMENT 'Website management permission',
  `manage_content` tinyint(1) DEFAULT '0' COMMENT 'Content creation permission',
  `manage_system` tinyint(1) DEFAULT '0' COMMENT 'System administration permission',
  `stripe_connect` tinyint(1) DEFAULT '0',
  `events` tinyint(1) DEFAULT '0',
  `tickets` tinyint(1) DEFAULT '0',
  `verified` tinyint(1) DEFAULT '0' COMMENT 'Artist verification status',
  PRIMARY KEY (`user_id`),
  KEY `idx_manage_sites` (`manage_sites`),
  KEY `idx_manage_content` (`manage_content`),
  KEY `idx_manage_system` (`manage_system`),
  KEY `idx_verified` (`verified`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_permissions_backup_granular`
--

DROP TABLE IF EXISTS `user_permissions_backup_granular`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions_backup_granular` (
  `user_id` bigint NOT NULL,
  `vendor` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_articles` tinyint(1) DEFAULT '0',
  `publish_articles` tinyint(1) DEFAULT '0',
  `manage_articles_seo` tinyint(1) DEFAULT '0',
  `manage_articles_topics` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_profiles`
--

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
  `timezone` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_user_profiles_name` (`first_name`,`last_name`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_subscriptions`
--

DROP TABLE IF EXISTS `user_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `subscription_type` enum('verification','shipping_labels') DEFAULT 'verification',
  `status` enum('active','canceled','past_due','unpaid','trialing','incomplete') DEFAULT 'incomplete',
  `current_period_start` timestamp NULL DEFAULT NULL,
  `current_period_end` timestamp NULL DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) DEFAULT '0',
  `prefer_connect_balance` tinyint(1) DEFAULT '0',
  `canceled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stripe_subscription_id` (`stripe_subscription_id`),
  KEY `idx_user_subscriptions` (`user_id`),
  KEY `idx_stripe_subscription` (`stripe_subscription_id`),
  KEY `idx_subscription_status` (`status`),
  KEY `idx_subscription_type` (`subscription_type`),
  CONSTRAINT `user_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_terms_acceptance`
--

DROP TABLE IF EXISTS `user_terms_acceptance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_terms_acceptance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `subscription_type` enum('general','verification','shipping_labels','marketplace','website') DEFAULT 'general',
  `terms_version_id` int NOT NULL,
  `accepted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_terms` (`user_id`,`terms_version_id`),
  KEY `idx_user_terms` (`user_id`,`terms_version_id`),
  KEY `idx_user_subscription_type` (`user_id`,`subscription_type`),
  KEY `terms_version_id` (`terms_version_id`),
  CONSTRAINT `user_terms_acceptance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_terms_acceptance_ibfk_2` FOREIGN KEY (`terms_version_id`) REFERENCES `terms_versions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_types`
--

DROP TABLE IF EXISTS `user_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_types` (
  `user_id` bigint NOT NULL,
  `type` enum('artist','promoter','community','admin') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`type`),
  KEY `idx_user_types_type` (`type`),
  CONSTRAINT `user_types_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_variation_types`
--

DROP TABLE IF EXISTS `user_variation_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_variation_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `variation_name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_variation` (`user_id`,`variation_name`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `user_variation_types_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_variation_values`
--

DROP TABLE IF EXISTS `user_variation_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_variation_values` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `product_id` bigint DEFAULT NULL,
  `variation_type_id` bigint NOT NULL,
  `value_name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_variation_value` (`product_id`,`variation_type_id`,`value_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_variation_type` (`variation_type_id`),
  KEY `idx_user_variation_values_product_id` (`product_id`),
  CONSTRAINT `fk_user_variation_values_product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_variation_values_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_variation_values_ibfk_2` FOREIGN KEY (`variation_type_id`) REFERENCES `user_variation_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_verifications`
--

DROP TABLE IF EXISTS `user_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_verifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `status` enum('pending','approved','rejected','more_info_requested') DEFAULT 'pending',
  `is_renewal` tinyint(1) DEFAULT '0',
  `raw_materials_photo` varchar(255) DEFAULT NULL,
  `wip_photo_1` varchar(255) DEFAULT NULL,
  `wip_photo_2` varchar(255) DEFAULT NULL,
  `artist_video` varchar(255) DEFAULT NULL,
  `finished_art_photo` varchar(255) DEFAULT NULL,
  `booth_display_media` varchar(255) DEFAULT NULL,
  `artist_info` json DEFAULT NULL COMMENT 'name, address, email, website, phone, socials',
  `juried_events` text COMMENT 'up to 10 events',
  `press_coverage` json DEFAULT NULL COMMENT 'up to 5 media files',
  `public_links` text COMMENT '5 links showing work publicly',
  `artist_statement` text,
  `additional_info` text,
  `other_files` json DEFAULT NULL COMMENT 'additional file paths array',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `admin_notes` text,
  `expires_at` timestamp NULL DEFAULT NULL COMMENT 'for renewals',
  PRIMARY KEY (`id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_pending` (`status`,`submitted_at`),
  KEY `idx_user_current` (`user_id`,`submitted_at` DESC),
  CONSTRAINT `user_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_verifications_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `email_verified` enum('yes','no') DEFAULT 'no',
  `user_type` enum('artist','promoter','community','admin','Draft') NOT NULL,
  `status` enum('active','inactive','suspended','draft','deleted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `wp_id` bigint DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `google_uid` varchar(128) DEFAULT NULL,
  `last_checklist_pass` timestamp NULL DEFAULT NULL,
  `onboarding_completed` enum('yes','no') DEFAULT 'no',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_google_uid` (`google_uid`),
  KEY `idx_search_users` (`user_type`,`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=1234567985 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `variant_kinds`
--

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

--
-- Table structure for table `vendor_settings`
--

DROP TABLE IF EXISTS `vendor_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `commission_rate` decimal(5,2) DEFAULT '15.00',
  `payout_days` int DEFAULT '15',
  `stripe_account_id` varchar(255) DEFAULT NULL,
  `stripe_account_verified` tinyint(1) DEFAULT '0',
  `reverse_transfer_enabled` tinyint(1) DEFAULT '0',
  `subscription_payment_method` enum('balance_first','card_only') DEFAULT 'card_only',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_id` (`vendor_id`),
  KEY `idx_stripe_account` (`stripe_account_id`),
  KEY `idx_verified` (`stripe_account_verified`),
  CONSTRAINT `vendor_settings_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_shipping_methods`
--

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

--
-- Table structure for table `vendor_sku_log`
--

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

--
-- Table structure for table `vendor_subscriptions`
--

DROP TABLE IF EXISTS `vendor_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `plan_name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('active','cancelled','past_due','unpaid') DEFAULT 'active',
  `current_period_start` date DEFAULT NULL,
  `current_period_end` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stripe_subscription` (`stripe_subscription_id`),
  KEY `idx_stripe_customer` (`stripe_customer_id`),
  KEY `idx_vendor_status` (`vendor_id`,`status`),
  CONSTRAINT `vendor_subscriptions_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_tax_summary`
--

DROP TABLE IF EXISTS `vendor_tax_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_tax_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `report_period` varchar(7) DEFAULT NULL,
  `total_sales` decimal(12,2) DEFAULT NULL,
  `total_taxable_amount` decimal(12,2) DEFAULT NULL,
  `total_tax_collected` decimal(12,2) DEFAULT NULL,
  `stripe_report_url` varchar(500) DEFAULT NULL,
  `report_generated` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_period` (`vendor_id`,`report_period`),
  KEY `idx_report_period` (`report_period`),
  CONSTRAINT `vendor_tax_summary_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_transactions`
--

DROP TABLE IF EXISTS `vendor_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint NOT NULL,
  `order_id` bigint DEFAULT NULL,
  `transaction_type` enum('sale','commission','payout','refund','adjustment','subscription_charge') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `commission_amount` decimal(10,2) DEFAULT NULL,
  `stripe_transfer_id` varchar(255) DEFAULT NULL,
  `payout_date` date DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `idx_vendor_payout` (`vendor_id`,`payout_date`),
  KEY `idx_stripe_transfer` (`stripe_transfer_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_status` (`status`),
  CONSTRAINT `vendor_transactions_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vendor_transactions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wp_artifacts`
--

DROP TABLE IF EXISTS `wp_artifacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wp_artifacts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `wp_id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `table_name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_wp_id` (`wp_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `wp_artifacts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'oaf'
--
/*!50003 DROP PROCEDURE IF EXISTS `replenish_vendor_skus` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`oafuser`@`%` PROCEDURE `replenish_vendor_skus`(IN vendorId BIGINT, IN batchSize INT)
BEGIN
    DECLARE lastSkuNumber INT DEFAULT 100;  
    DECLARE i INT DEFAULT 0;

    
    SELECT IFNULL(MAX(CAST(SUBSTRING(sku, 4) AS UNSIGNED)), 100)
    INTO lastSkuNumber
    FROM vendor_sku_log
    WHERE vendor_id = vendorId
    AND sku REGEXP '^ART[0-9]+$';

    
    WHILE i < batchSize DO
        SET lastSkuNumber = lastSkuNumber + 1;
        INSERT INTO vendor_sku_log (vendor_id, sku)
        VALUES (vendorId, CONCAT('ART', lastSkuNumber));
        SET i = i + 1;
    END WHILE;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-31 18:06:31

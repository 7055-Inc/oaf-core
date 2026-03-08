-- Migration 011: Email Marketing - Subscribers System
-- Date: 2026-02-08
-- Description: Creates tables for email subscriber management across user lists

-- Global subscribers table (deduplicated emails)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  global_unsubscribe TINYINT(1) DEFAULT 0,
  email_verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_global_unsubscribe (global_unsubscribe),
  INDEX idx_verification_token (verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-specific email lists (relationships)
CREATE TABLE IF NOT EXISTS user_email_lists (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  subscriber_id BIGINT NOT NULL,
  status ENUM('subscribed', 'unsubscribed', 'bounced', 'spam') DEFAULT 'subscribed',
  tags JSON DEFAULT NULL,
  custom_fields JSON DEFAULT NULL,
  source VARCHAR(255) DEFAULT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_subscriber (user_id, subscriber_id),
  INDEX idx_user_id (user_id),
  INDEX idx_subscriber_id (subscriber_id),
  INDEX idx_status (status),
  INDEX idx_subscribed_at (subscribed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email campaigns (extends drip system with single blasts)
CREATE TABLE IF NOT EXISTS email_campaigns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type ENUM('single_blast', 'drip_series') DEFAULT 'single_blast',
  subject_line VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255) DEFAULT NULL,
  email_body LONGTEXT NOT NULL,
  from_name VARCHAR(100) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255) DEFAULT NULL,
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled') DEFAULT 'draft',
  send_type ENUM('immediate', 'scheduled') DEFAULT 'immediate',
  scheduled_at TIMESTAMP NULL DEFAULT NULL,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  recipient_count INT DEFAULT 0,
  filter_tags JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_campaign_type (campaign_type),
  INDEX idx_scheduled_at (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign analytics
CREATE TABLE IF NOT EXISTS email_campaign_analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  subscriber_id BIGINT NOT NULL,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  delivered_at TIMESTAMP NULL DEFAULT NULL,
  opened_at TIMESTAMP NULL DEFAULT NULL,
  clicked_at TIMESTAMP NULL DEFAULT NULL,
  bounced_at TIMESTAMP NULL DEFAULT NULL,
  bounce_type ENUM('soft', 'hard') DEFAULT NULL,
  bounce_reason TEXT DEFAULT NULL,
  unsubscribed_at TIMESTAMP NULL DEFAULT NULL,
  spam_reported_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_campaign_subscriber (campaign_id, subscriber_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_subscriber_id (subscriber_id),
  INDEX idx_opened_at (opened_at),
  INDEX idx_clicked_at (clicked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email collection forms (for artist sites)
CREATE TABLE IF NOT EXISTS email_collection_forms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  form_name VARCHAR(255) NOT NULL,
  form_type ENUM('inline', 'popup', 'exit_intent') DEFAULT 'inline',
  heading VARCHAR(255) DEFAULT 'Stay Updated',
  description TEXT DEFAULT NULL,
  button_text VARCHAR(100) DEFAULT 'Subscribe',
  success_message VARCHAR(500) DEFAULT 'Thanks for subscribing!',
  auto_tags JSON DEFAULT NULL,
  double_opt_in TINYINT(1) DEFAULT 1,
  redirect_url VARCHAR(500) DEFAULT NULL,
  background_color VARCHAR(20) DEFAULT '#ffffff',
  text_color VARCHAR(20) DEFAULT '#333333',
  button_color VARCHAR(20) DEFAULT '#055474',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables created
SHOW TABLES LIKE 'email_%';
SHOW TABLES LIKE 'user_email_lists';

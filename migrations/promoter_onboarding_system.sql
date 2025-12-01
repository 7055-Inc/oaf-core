-- ============================================================================
-- PROMOTER ONBOARDING SYSTEM - Database Schema
-- ============================================================================
-- This migration adds support for admin-created draft promoters with event claiming
-- and automated drip campaign onboarding
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALTER EXISTING TABLES (Safe - checks if columns exist first)
-- ----------------------------------------------------------------------------

-- Add fields to users table for admin-created draft accounts (if not exists)
-- Note: These fields were added in a previous migration and should already exist

-- Add fields to events table for claim tracking (if not exists)  
-- Note: These fields were added in a previous migration and should already exist

-- ----------------------------------------------------------------------------
-- 2. CREATE NEW TABLES
-- ----------------------------------------------------------------------------

-- Claim tokens for promoter event claiming
CREATE TABLE `promoter_claim_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT 'Draft promoter user',
  `event_id` bigint NOT NULL COMMENT 'Event to be claimed',
  `token` varchar(64) NOT NULL COMMENT 'Secure claim token',
  `promoter_email` varchar(255) NOT NULL COMMENT 'Email for verification',
  `expires_at` timestamp NOT NULL COMMENT 'Token expiration (6 months)',
  `claimed` tinyint(1) DEFAULT 0 COMMENT 'Whether token has been claimed',
  `claimed_at` timestamp NULL DEFAULT NULL COMMENT 'When token was claimed',
  `created_by_admin_id` bigint NOT NULL COMMENT 'Admin who created this token',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_user_event` (`user_id`, `event_id`),
  KEY `idx_email` (`promoter_email`),
  KEY `idx_claimed` (`claimed`, `expires_at`),
  CONSTRAINT `promoter_claim_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promoter_claim_tokens_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promoter_claim_tokens_ibfk_3` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Onboarding email campaigns (templates for drip sequences)
CREATE TABLE `onboarding_campaigns` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Campaign name',
  `description` text COMMENT 'Campaign description',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Active status',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Email templates within campaigns
CREATE TABLE `onboarding_email_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint NOT NULL,
  `sequence_order` int NOT NULL COMMENT 'Order in campaign sequence',
  `days_after_claim` int NOT NULL COMMENT 'Days after claim to send',
  `subject` varchar(255) NOT NULL COMMENT 'Email subject line',
  `template_key` varchar(100) NOT NULL COMMENT 'Email template identifier',
  `feature_check_function` varchar(100) DEFAULT NULL COMMENT 'Function name to check if email should be skipped',
  `feature_check_params` json DEFAULT NULL COMMENT 'Parameters for feature check',
  `cta_url` varchar(500) DEFAULT NULL COMMENT 'Call-to-action URL',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Active status',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`, `sequence_order`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `onboarding_email_templates_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `onboarding_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- User enrollment in campaigns
CREATE TABLE `user_campaign_enrollments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `campaign_id` bigint NOT NULL,
  `enrolled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When user was enrolled',
  `current_step` int DEFAULT 0 COMMENT 'Current sequence step',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'When campaign completed',
  `paused_at` timestamp NULL DEFAULT NULL COMMENT 'If paused, when',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_campaign` (`user_id`, `campaign_id`),
  KEY `idx_active_enrollments` (`campaign_id`, `completed_at`, `paused_at`),
  CONSTRAINT `user_campaign_enrollments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_campaign_enrollments_ibfk_2` FOREIGN KEY (`campaign_id`) REFERENCES `onboarding_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Track sent emails (for analytics and preventing duplicates)
CREATE TABLE `user_campaign_emails` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `enrollment_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `opened_at` timestamp NULL DEFAULT NULL COMMENT 'When email was opened',
  `clicked_at` timestamp NULL DEFAULT NULL COMMENT 'When link was clicked',
  `skipped` tinyint(1) DEFAULT 0 COMMENT 'Was email skipped',
  `skip_reason` varchar(255) DEFAULT NULL COMMENT 'Why email was skipped',
  PRIMARY KEY (`id`),
  KEY `idx_user_template` (`user_id`, `template_id`),
  KEY `idx_enrollment` (`enrollment_id`),
  KEY `idx_sent` (`sent_at`),
  CONSTRAINT `user_campaign_emails_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_campaign_emails_ibfk_2` FOREIGN KEY (`enrollment_id`) REFERENCES `user_campaign_enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_campaign_emails_ibfk_3` FOREIGN KEY (`template_id`) REFERENCES `onboarding_email_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 3. SEED DEFAULT CAMPAIGN
-- ----------------------------------------------------------------------------

-- Insert default promoter onboarding campaign
INSERT INTO `onboarding_campaigns` (`name`, `description`, `is_active`) 
VALUES ('Promoter Onboarding 2025', 'Standard promoter onboarding sequence with feature-based branching', 1);

-- Get the campaign ID (will be 1 if this is first campaign)
SET @campaign_id = LAST_INSERT_ID();

-- Insert email templates for the campaign
INSERT INTO `onboarding_email_templates` 
  (`campaign_id`, `sequence_order`, `days_after_claim`, `subject`, `template_key`, `feature_check_function`, `cta_url`) 
VALUES
  -- Day 0: Welcome email
  (@campaign_id, 1, 0, 'Welcome to Brakebee! Let\'s Complete Your Event', 'onboarding_welcome', NULL, '/events/{event_id}/edit'),
  
  -- Day 1: Complete event profile (skip if event published)
  (@campaign_id, 2, 1, 'Complete Your Event Profile', 'onboarding_complete_event', 'event_is_published', '/events/{event_id}/edit'),
  
  -- Day 3: Publish event (skip if published)
  (@campaign_id, 3, 3, 'Ready to Publish Your Event?', 'onboarding_publish_event', 'event_is_published', '/events/{event_id}/edit'),
  
  -- Day 5: Add photos (skip if has photos)
  (@campaign_id, 4, 5, 'Make Your Event Stand Out With Photos', 'onboarding_add_photos', 'event_has_photos', '/events/{event_id}/photos'),
  
  -- Day 7: Start accepting applications (skip if accepting)
  (@campaign_id, 5, 7, 'Start Accepting Artist Applications', 'onboarding_accept_applications', 'event_accepting_applications', '/events/{event_id}/edit'),
  
  -- Day 10: Create ticket tiers (skip if has tickets)
  (@campaign_id, 6, 10, 'Set Up Ticket Sales', 'onboarding_create_tickets', 'event_has_tickets', '/events/{event_id}/tickets'),
  
  -- Day 14: Review applications (skip if reviewed)
  (@campaign_id, 7, 14, 'Tips for Reviewing Artist Applications', 'onboarding_review_applications', 'promoter_has_reviewed_applications', '/dashboard/applications'),
  
  -- Day 21: Order marketing materials (always send)
  (@campaign_id, 8, 21, 'Boost Your Event With Marketing Materials', 'onboarding_marketing_materials', NULL, '/marketing-materials'),
  
  -- Day 30: Advanced features
  (@campaign_id, 9, 30, 'Advanced Features: Jury Packets & More', 'onboarding_advanced_features', NULL, '/dashboard');

-- ----------------------------------------------------------------------------
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index for finding unclaimed accounts (cleanup job)
CREATE INDEX `idx_draft_unclaimed` ON `users` (`status`, `created_at`, `created_by_admin_id`);

-- Index for finding pending claim events
CREATE INDEX `idx_pending_claims` ON `events` (`claim_status`, `created_at`);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


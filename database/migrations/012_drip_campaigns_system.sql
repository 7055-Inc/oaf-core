/**
 * Drip Campaign System Migration
 * 
 * Creates tables for automated email drip campaigns with:
 * - Behavior-based triggers
 * - Frequency management (6/day max, 2hr gaps)
 * - Conversion tracking
 * - Comprehensive analytics
 * - Custom exit conditions
 */

-- ============================================================================
-- 1. DRIP CAMPAIGNS - Campaign definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_campaigns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Identity
  campaign_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'marketing', -- onboarding, marketing, retention, etc.
  
  -- Ownership & Access
  is_system TINYINT(1) DEFAULT 0, -- System (admin-created) vs user-created
  created_by BIGINT NULL, -- NULL for system campaigns, user_id for custom
  user_tier_required VARCHAR(20) DEFAULT 'free', -- free, pro, premium
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  is_published TINYINT(1) DEFAULT 0, -- Visible in marketplace/library
  
  -- Frequency Management
  priority_level TINYINT DEFAULT 3, -- 1-5, higher = more important when hitting limits
  counts_toward_daily_limit TINYINT(1) DEFAULT 1, -- Some campaigns might bypass limits
  min_hours_between_emails INT DEFAULT 2, -- Minimum gap between this campaign's emails
  
  -- Conversion Goal (campaign-level default)
  conversion_goal_type VARCHAR(50) NULL, -- purchase, signup, event_application, etc.
  conversion_goal_config JSON NULL, -- { value_field, event_id, conditions, etc. }
  attribution_window_hours INT DEFAULT 168, -- 7 days default
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign_key (campaign_key),
  INDEX idx_system (is_system, is_published, is_active),
  INDEX idx_creator (created_by),
  INDEX idx_category (category),
  INDEX idx_priority (priority_level),
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. DRIP STEPS - Email sequence definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_steps (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  
  -- Step Order
  step_number INT NOT NULL,
  step_name VARCHAR(255) NULL, -- Optional friendly name
  
  -- Email Template
  template_key VARCHAR(100) NOT NULL, -- References email_templates
  
  -- Timing
  delay_amount INT NOT NULL, -- How long to wait
  delay_unit ENUM('minutes', 'hours', 'days', 'weeks') DEFAULT 'days',
  delay_from ENUM('enrollment', 'previous_step') DEFAULT 'previous_step',
  
  -- Expiry
  expires_at DATETIME NULL, -- Absolute date (e.g., sale ends Dec 31)
  expires_after_enrollment_days INT NULL, -- Relative (e.g., must send within 7 days of enrollment)
  
  -- Conditions
  send_conditions JSON NULL, -- Conditions that must be met to send (e.g., cart still active)
  exit_conditions JSON NULL, -- Conditions that cause campaign exit (e.g., purchased)
  
  -- Step-Level Conversion Goal (overrides campaign default)
  conversion_goal_type VARCHAR(50) NULL,
  conversion_goal_config JSON NULL,
  attribution_window_hours INT NULL,
  
  -- Variable Configuration for dynamic content
  variable_config JSON NULL, -- How to build personalized variables
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign (campaign_id),
  INDEX idx_campaign_step (campaign_id, step_number),
  INDEX idx_template (template_key),
  INDEX idx_expiry (expires_at),
  
  UNIQUE KEY unique_campaign_step (campaign_id, step_number),
  
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. DRIP TRIGGERS - Campaign trigger definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_triggers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  
  -- Trigger Type
  trigger_type ENUM('event', 'behavior_threshold', 'manual', 'scheduled') NOT NULL,
  
  -- Event-Based Trigger
  event_name VARCHAR(100) NULL, -- user_signup, product_purchased, cart_abandoned, etc.
  event_conditions JSON NULL, -- Additional filters on the event
  
  -- Behavior-Based Trigger
  behavior_type VARCHAR(100) NULL, -- product_view, page_view, search, etc.
  behavior_rule JSON NULL, -- { filter: { artist_id: 'same' }, threshold: 5, timeframe: '7 days' }
  
  -- Scheduled Trigger
  schedule_config JSON NULL, -- For time-based campaigns
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign (campaign_id),
  INDEX idx_trigger_type (trigger_type),
  INDEX idx_event (event_name, is_active),
  INDEX idx_behavior (behavior_type, is_active),
  
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. DRIP ENROLLMENTS - User journey tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_enrollments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  campaign_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  
  -- Progress
  current_step INT DEFAULT 0,
  status ENUM('active', 'paused', 'completed', 'exited') DEFAULT 'active',
  
  -- Context Data (for personalization)
  context_data JSON NULL, -- { artist_id: 123, product_ids: [1,2,3], event_id: 456 }
  
  -- Timing
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  next_send_at DATETIME NULL, -- When next email should be sent
  next_available_send_at DATETIME NULL, -- Respects frequency limits
  completed_at DATETIME NULL,
  exited_at DATETIME NULL,
  
  -- Exit Information
  exit_reason VARCHAR(100) NULL, -- completed, unsubscribed, goal_reached, conditions_not_met, etc.
  exit_step INT NULL, -- Which step they exited on
  
  -- Frequency Management
  suppression_count INT DEFAULT 0, -- How many times sending was delayed
  last_suppression_reason VARCHAR(255) NULL,
  last_suppression_at DATETIME NULL,
  last_email_sent_at DATETIME NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign (campaign_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_next_send (status, next_send_at),
  INDEX idx_campaign_user (campaign_id, user_id),
  INDEX idx_active_ready (status, next_send_at, next_available_send_at),
  
  UNIQUE KEY unique_campaign_user (campaign_id, user_id),
  
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. DRIP EVENTS - Individual email event tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  enrollment_id BIGINT NOT NULL,
  campaign_id BIGINT NOT NULL,
  step_number INT NOT NULL,
  user_id BIGINT NOT NULL,
  
  -- Email Details
  email_log_id BIGINT NULL, -- Links to email_log table
  template_key VARCHAR(100) NOT NULL,
  
  -- Event Type
  event_type ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'suppressed', 'expired', 'skipped') NOT NULL,
  
  -- Event Data
  event_data JSON NULL, -- Link clicked, bounce reason, etc.
  
  -- Suppression/Skip Tracking
  suppression_reason VARCHAR(255) NULL, -- daily_limit, frequency_cap, priority_lower, etc.
  skip_reason VARCHAR(255) NULL, -- expired, conditions_not_met, etc.
  
  -- Device/Context
  device_type VARCHAR(50) NULL,
  user_agent TEXT NULL,
  ip_address VARCHAR(45) NULL,
  
  -- Timing
  event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_enrollment (enrollment_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_user (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_timestamp (event_timestamp),
  INDEX idx_campaign_step (campaign_id, step_number),
  INDEX idx_email_log (email_log_id),
  
  FOREIGN KEY (enrollment_id) REFERENCES drip_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (email_log_id) REFERENCES email_log(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. DRIP CONVERSIONS - Conversion tracking with attribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_conversions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  enrollment_id BIGINT NOT NULL,
  campaign_id BIGINT NOT NULL,
  step_number INT NULL, -- Which email gets attribution (NULL = campaign overall)
  user_id BIGINT NOT NULL,
  
  -- Conversion Details
  conversion_type VARCHAR(50) NOT NULL, -- purchase, signup, event_application, etc.
  conversion_value DECIMAL(10,2) NULL, -- Revenue or other numeric value
  conversion_data JSON NULL, -- Order details, event info, etc.
  
  -- Attribution
  attributed_event_id BIGINT NULL, -- The email event that gets credit (opened, clicked)
  attribution_model VARCHAR(50) DEFAULT 'last_click', -- last_click, first_click, linear, etc.
  
  -- Timing
  conversion_timestamp TIMESTAMP NOT NULL,
  time_to_conversion_hours INT NULL, -- Hours from email send to conversion
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_enrollment (enrollment_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_user (user_id),
  INDEX idx_type (conversion_type),
  INDEX idx_timestamp (conversion_timestamp),
  INDEX idx_campaign_step (campaign_id, step_number),
  INDEX idx_event (attributed_event_id),
  
  FOREIGN KEY (enrollment_id) REFERENCES drip_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (attributed_event_id) REFERENCES drip_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. DRIP ANALYTICS - Aggregated campaign/step metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS drip_analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  campaign_id BIGINT NOT NULL,
  step_number INT NULL, -- NULL = campaign-level aggregation
  
  -- Enrollment Metrics
  total_enrollments INT DEFAULT 0,
  active_enrollments INT DEFAULT 0,
  completed_enrollments INT DEFAULT 0,
  exited_enrollments INT DEFAULT 0,
  
  -- Email Performance
  emails_queued INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_delivered INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  emails_unsubscribed INT DEFAULT 0,
  
  -- Suppression & Expiry
  emails_suppressed INT DEFAULT 0,
  emails_expired INT DEFAULT 0,
  emails_skipped INT DEFAULT 0,
  
  -- Engagement Rates (calculated)
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  click_to_open_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Conversion Metrics
  total_conversions INT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  total_conversion_value DECIMAL(12,2) DEFAULT 0.00,
  average_conversion_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timing Metrics
  average_time_to_open_hours DECIMAL(10,2) NULL,
  average_time_to_click_hours DECIMAL(10,2) NULL,
  average_time_to_conversion_hours DECIMAL(10,2) NULL,
  
  -- Last Updated
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign (campaign_id),
  INDEX idx_campaign_step (campaign_id, step_number),
  INDEX idx_updated (last_calculated_at),
  
  UNIQUE KEY unique_campaign_step_analytics (campaign_id, step_number),
  
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- UTILITY TABLES
-- ============================================================================

-- User Drip Preferences (which system campaigns they've enabled)
CREATE TABLE IF NOT EXISTS user_drip_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  campaign_id BIGINT NOT NULL,
  is_enabled TINYINT(1) DEFAULT 1,
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled_at DATETIME NULL,
  
  -- Indexes
  INDEX idx_user (user_id),
  INDEX idx_campaign (campaign_id),
  UNIQUE KEY unique_user_campaign (user_id, campaign_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drip Frequency Limits (per-user daily tracking)
CREATE TABLE IF NOT EXISTS drip_frequency_tracking (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  tracking_date DATE NOT NULL,
  
  -- Daily Counts
  drip_emails_sent_today INT DEFAULT 0,
  last_drip_sent_at DATETIME NULL,
  
  -- Pause Status
  is_paused TINYINT(1) DEFAULT 0,
  paused_until DATETIME NULL,
  pause_reason VARCHAR(255) NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_date (user_id, tracking_date),
  INDEX idx_paused (is_paused, paused_until),
  UNIQUE KEY unique_user_date (user_id, tracking_date),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

ALTER TABLE drip_campaigns COMMENT = 'Drip campaign definitions with triggers and frequency rules';
ALTER TABLE drip_steps COMMENT = 'Email sequence steps with timing and expiry rules';
ALTER TABLE drip_triggers COMMENT = 'Behavior and event-based trigger definitions';
ALTER TABLE drip_enrollments COMMENT = 'User journey tracking through drip campaigns';
ALTER TABLE drip_events COMMENT = 'Individual email events for detailed tracking';
ALTER TABLE drip_conversions COMMENT = 'Conversion tracking with attribution';
ALTER TABLE drip_analytics COMMENT = 'Aggregated campaign and step performance metrics';
ALTER TABLE user_drip_preferences COMMENT = 'User preferences for system campaigns';
ALTER TABLE drip_frequency_tracking COMMENT = 'Per-user daily frequency tracking and pause status';

/**
 * Email Marketing - Subscriber & List Management
 * 
 * Extends drip campaign system with:
 * - Global deduplicated subscriber pool
 * - Per-user email lists with tagging
 * - Single blast campaign support
 * - Analytics tracking
 */

-- ============================================================================
-- 1. GLOBAL SUBSCRIBERS - Deduplicated email pool
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_subscribers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Identity
  email VARCHAR(255) NOT NULL UNIQUE,
  email_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash for privacy/lookup
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  
  -- Global Status
  global_unsubscribe TINYINT(1) DEFAULT 0, -- Opted out from ALL emails everywhere
  global_bounce TINYINT(1) DEFAULT 0, -- Email bounced (invalid)
  global_spam_complaint TINYINT(1) DEFAULT 0, -- Marked as spam
  
  -- Source Tracking
  original_source VARCHAR(100) NULL, -- Where they first subscribed
  original_user_id BIGINT NULL, -- Which user first captured them
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP NULL, -- Last open/click
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_email_hash (email_hash),
  INDEX idx_global_status (global_unsubscribe, global_bounce, global_spam_complaint),
  INDEX idx_original_user (original_user_id),
  INDEX idx_last_activity (last_activity_at),
  
  FOREIGN KEY (original_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. USER EMAIL LISTS - Per-user subscriber relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_email_lists (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Relationships
  user_id BIGINT NOT NULL, -- The artist/user who owns this subscriber
  subscriber_id BIGINT NOT NULL, -- Reference to email_subscribers
  
  -- List-Specific Status
  status ENUM('subscribed', 'unsubscribed', 'bounced', 'spam_complaint') DEFAULT 'subscribed',
  
  -- Tagging System (JSON array of strings)
  tags JSON NULL, -- ["customer", "gallery-visitor", "vip", "art-enthusiast"]
  
  -- Custom Fields (flexible per-user data)
  custom_fields JSON NULL, -- {"favorite_medium": "oil", "budget": "high", "interests": ["abstract", "portraits"]}
  
  -- Source Tracking
  source VARCHAR(100) NULL, -- "signup-form", "manual-import", "checkout", "gallery-visit"
  source_site_id BIGINT NULL, -- If from a specific site
  source_url TEXT NULL, -- Page URL where they subscribed
  
  -- Engagement Tracking
  total_opens INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  last_open_at TIMESTAMP NULL,
  last_click_at TIMESTAMP NULL,
  
  -- Timestamps
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints & Indexes
  UNIQUE KEY unique_user_subscriber (user_id, subscriber_id),
  INDEX idx_user (user_id),
  INDEX idx_subscriber (subscriber_id),
  INDEX idx_status (status),
  INDEX idx_user_status (user_id, status),
  INDEX idx_source_site (source_site_id),
  INDEX idx_engagement (total_opens, total_clicks),
  INDEX idx_subscribed_at (subscribed_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (source_site_id) REFERENCES sites(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. EXTEND DRIP CAMPAIGNS - Add single blast support
-- ============================================================================

-- Note: Run each ALTER separately, ignore errors if columns exist

-- Add campaign_type column
ALTER TABLE drip_campaigns 
ADD COLUMN campaign_type ENUM('drip_series', 'single_blast') DEFAULT 'drip_series' AFTER category;

-- Add template_key column (for single blasts)
ALTER TABLE drip_campaigns
ADD COLUMN template_key VARCHAR(100) NULL AFTER campaign_type;

-- Add scheduled_send_at column
ALTER TABLE drip_campaigns
ADD COLUMN scheduled_send_at DATETIME NULL AFTER template_key;

-- Add sent_at column
ALTER TABLE drip_campaigns
ADD COLUMN sent_at DATETIME NULL AFTER scheduled_send_at;

-- Add send_status column
ALTER TABLE drip_campaigns
ADD COLUMN send_status ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled') DEFAULT 'draft' AFTER sent_at;

-- Add target_list_filter for single blasts (JSON for tag-based filtering)
ALTER TABLE drip_campaigns
ADD COLUMN target_list_filter JSON NULL AFTER send_status;

-- Add indexes
CREATE INDEX idx_campaign_type ON drip_campaigns(campaign_type);
CREATE INDEX idx_send_status ON drip_campaigns(send_status);
CREATE INDEX idx_scheduled_send ON drip_campaigns(scheduled_send_at);

-- ============================================================================
-- 4. EMAIL CAMPAIGN ANALYTICS - Tracking opens, clicks, bounces
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_campaign_analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Campaign Reference
  campaign_id BIGINT NOT NULL, -- drip_campaigns.id
  step_id BIGINT NULL, -- drip_steps.id (NULL for single blasts)
  
  -- Recipient
  user_list_id BIGINT NOT NULL, -- user_email_lists.id
  subscriber_id BIGINT NOT NULL, -- email_subscribers.id
  
  -- Send Info
  sent_at TIMESTAMP NOT NULL,
  email_subject VARCHAR(500) NULL,
  email_from VARCHAR(255) NULL,
  
  -- Tracking
  opened TINYINT(1) DEFAULT 0,
  first_opened_at TIMESTAMP NULL,
  open_count INT DEFAULT 0,
  last_opened_at TIMESTAMP NULL,
  
  clicked TINYINT(1) DEFAULT 0,
  first_clicked_at TIMESTAMP NULL,
  click_count INT DEFAULT 0,
  last_clicked_at TIMESTAMP NULL,
  clicked_links JSON NULL, -- Array of URLs clicked
  
  bounced TINYINT(1) DEFAULT 0,
  bounce_type VARCHAR(20) NULL, -- 'hard', 'soft'
  bounced_at TIMESTAMP NULL,
  bounce_reason TEXT NULL,
  
  spam_complaint TINYINT(1) DEFAULT 0,
  spam_complaint_at TIMESTAMP NULL,
  
  unsubscribed TINYINT(1) DEFAULT 0,
  unsubscribed_at TIMESTAMP NULL,
  
  -- Device/Client Info
  user_agent TEXT NULL,
  ip_address VARCHAR(45) NULL,
  device_type VARCHAR(20) NULL, -- 'desktop', 'mobile', 'tablet'
  email_client VARCHAR(50) NULL, -- 'gmail', 'outlook', etc.
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_campaign (campaign_id),
  INDEX idx_step (step_id),
  INDEX idx_user_list (user_list_id),
  INDEX idx_subscriber (subscriber_id),
  INDEX idx_sent_at (sent_at),
  INDEX idx_opened (opened, first_opened_at),
  INDEX idx_clicked (clicked, first_clicked_at),
  INDEX idx_bounced (bounced),
  INDEX idx_spam (spam_complaint),
  INDEX idx_unsubscribed (unsubscribed),
  
  FOREIGN KEY (campaign_id) REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES drip_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (user_list_id) REFERENCES user_email_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriber_id) REFERENCES email_subscribers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. EMAIL COLLECTION FORMS - Signup form configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_collection_forms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- Ownership
  user_id BIGINT NOT NULL,
  site_id BIGINT NULL, -- If form is for a specific site
  
  -- Form Config
  form_name VARCHAR(255) NOT NULL,
  form_type ENUM('inline', 'popup', 'exit_intent', 'embedded') DEFAULT 'inline',
  
  -- Fields to Collect
  collect_first_name TINYINT(1) DEFAULT 1,
  collect_last_name TINYINT(1) DEFAULT 0,
  collect_custom_fields JSON NULL, -- Additional fields to collect
  
  -- Display Settings
  form_title VARCHAR(255) NULL,
  form_description TEXT NULL,
  submit_button_text VARCHAR(100) DEFAULT 'Subscribe',
  success_message TEXT NULL,
  
  -- Auto-Tagging
  auto_tags JSON NULL, -- Automatically tag subscribers from this form
  
  -- Double Opt-In
  require_double_optin TINYINT(1) DEFAULT 1,
  confirmation_template_key VARCHAR(100) NULL,
  
  -- Redirect After Signup
  redirect_url TEXT NULL,
  
  -- Styling
  custom_css TEXT NULL,
  primary_color VARCHAR(20) DEFAULT '#055474',
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  
  -- Stats
  total_submissions INT DEFAULT 0,
  total_confirmed INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user (user_id),
  INDEX idx_site (site_id),
  INDEX idx_active (is_active),
  INDEX idx_form_type (form_type),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show created tables
SHOW TABLES LIKE 'email_%';
SHOW TABLES LIKE 'user_email_lists';

-- Describe key tables
SELECT 'email_subscribers' as table_name;
DESCRIBE email_subscribers;

SELECT 'user_email_lists' as table_name;
DESCRIBE user_email_lists;

SELECT 'email_campaign_analytics' as table_name;
DESCRIBE email_campaign_analytics;

SELECT 'email_collection_forms' as table_name;
DESCRIBE email_collection_forms;

-- Show drip_campaigns modifications
SELECT 'drip_campaigns (modified)' as table_name;
SHOW COLUMNS FROM drip_campaigns WHERE Field IN ('campaign_type', 'template_key', 'scheduled_send_at', 'sent_at', 'send_status');

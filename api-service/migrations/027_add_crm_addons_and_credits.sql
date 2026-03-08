-- Migration 027: Add CRM Subscription Addons and Pay-Per-Send System
-- 
-- Adds:
-- 1. Extra drip campaign addons ($5/month each)
-- 2. Pay-per-send blast credits for Free tier ($10 per blast)
-- 3. Single blast usage tracking

-- ============================================================================
-- 1. CRM SUBSCRIPTION ADDONS TABLE
-- ============================================================================
-- Track user-purchased addons for CRM subscription (e.g., extra drip campaigns)

CREATE TABLE IF NOT EXISTS crm_subscription_addons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  addon_type ENUM('extra_drip_campaign') NOT NULL COMMENT 'Type of addon',
  quantity INT DEFAULT 1 COMMENT 'Number of this addon purchased',
  monthly_price DECIMAL(10,2) NOT NULL COMMENT 'Monthly price per addon',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether addon is currently active',
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP NULL,
  stripe_subscription_item_id VARCHAR(255) NULL COMMENT 'Stripe subscription item ID for billing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_addon_type (addon_type),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT='CRM subscription add-ons like extra drip campaigns';

-- ============================================================================
-- 2. CRM BLAST CREDITS TABLE
-- ============================================================================
-- Track pay-per-send blast credits for Free tier users

CREATE TABLE IF NOT EXISTS crm_blast_credits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  credits INT NOT NULL DEFAULT 0 COMMENT 'Number of blast credits available',
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When credits were purchased',
  expires_at TIMESTAMP NULL COMMENT 'When credits expire (if applicable)',
  stripe_payment_intent_id VARCHAR(255) NULL COMMENT 'Stripe payment for these credits',
  amount_paid DECIMAL(10,2) NULL COMMENT 'Amount paid for these credits',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_active_credits (user_id, expires_at),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT='Pay-per-send blast credits for Free tier CRM users';

-- ============================================================================
-- 3. SINGLE BLAST USAGE TRACKING
-- ============================================================================
-- Track monthly single blast usage for tier limits

CREATE TABLE IF NOT EXISTS crm_single_blast_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  campaign_id BIGINT NULL COMMENT 'Reference to drip_campaigns.id',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recipient_count INT NOT NULL DEFAULT 0 COMMENT 'Number of recipients',
  used_credit TINYINT(1) DEFAULT 0 COMMENT 'Whether this used a pay-per-send credit',
  credit_record_id BIGINT NULL COMMENT 'Reference to crm_blast_credits.id if used credit',
  
  INDEX idx_user_month (user_id, sent_at),
  INDEX idx_campaign (campaign_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (credit_record_id) REFERENCES crm_blast_credits(id) ON DELETE SET NULL
) COMMENT='Track single blast campaign usage for tier limit enforcement';

-- ============================================================================
-- 4. UPDATE FREE TIER TO BE SELECTABLE
-- ============================================================================
-- Allow Free tier selection without requiring payment

-- Free tier users can select tier without card/payment
-- Backend will handle Free tier logic (tier_price = 0, no stripe subscription)

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

SELECT 'CRM Subscription Addons Table Created' as step, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'crm_subscription_addons';

SELECT 'CRM Blast Credits Table Created' as step, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'crm_blast_credits';

SELECT 'CRM Single Blast Usage Table Created' as step, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'crm_single_blast_usage';

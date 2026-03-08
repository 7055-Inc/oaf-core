-- =====================================================
-- AFFILIATE SYSTEM - DATABASE MIGRATION
-- Created: 2026-01-16
-- Status: APPLIED TO PRODUCTION
-- =====================================================

-- =====================================================
-- AFFILIATE CORE TABLES
-- =====================================================

-- 1. Core affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  affiliate_code VARCHAR(20) NOT NULL UNIQUE,
  affiliate_type ENUM('promoter', 'artist', 'community') NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  status ENUM('active', 'suspended', 'pending') DEFAULT 'active',
  payout_method ENUM('stripe', 'site_credit') NOT NULL,
  stripe_account_id VARCHAR(255) NULL,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  pending_balance DECIMAL(10,2) DEFAULT 0.00,
  paid_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_affiliate_code (affiliate_code),
  INDEX idx_affiliate_status (status),
  INDEX idx_affiliate_user_id (user_id)
);

-- 2. Affiliate referrals (visit tracking for analytics)
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  session_id VARCHAR(255) NULL,
  referred_user_id BIGINT NULL,
  source_type ENUM('link', 'promoter_site') NOT NULL,
  promoter_site_id BIGINT NULL,
  landing_url VARCHAR(500),
  referrer_url VARCHAR(500),
  user_agent VARCHAR(500),
  ip_hash VARCHAR(64),
  converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  INDEX idx_aff_ref_affiliate_id (affiliate_id),
  INDEX idx_aff_ref_session_id (session_id),
  INDEX idx_aff_ref_created_at (created_at)
);

-- 3. Affiliate commissions (per order item)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  
  order_item_amount DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL,
  affiliate_rate DECIMAL(5,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  
  status ENUM('pending', 'eligible', 'processing', 'paid', 'cancelled', 'clawback') DEFAULT 'pending',
  status_reason VARCHAR(255) NULL,
  eligible_date DATE NOT NULL,
  paid_date DATE NULL,
  
  payout_id BIGINT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  
  INDEX idx_aff_comm_affiliate_id (affiliate_id),
  INDEX idx_aff_comm_order_id (order_id),
  INDEX idx_aff_comm_status (status),
  INDEX idx_aff_comm_eligible_date (eligible_date),
  INDEX idx_aff_comm_payout_id (payout_id)
);

-- 4. Affiliate payouts (batched payout records)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  affiliate_id BIGINT NOT NULL,
  
  total_amount DECIMAL(10,2) NOT NULL,
  commission_count INT NOT NULL,
  
  payout_method ENUM('stripe', 'site_credit') NOT NULL,
  stripe_transfer_id VARCHAR(255) NULL,
  site_credit_transaction_id BIGINT NULL,
  
  status ENUM('scheduled', 'processing', 'completed', 'failed') DEFAULT 'scheduled',
  failure_reason VARCHAR(500) NULL,
  
  scheduled_for DATETIME NOT NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  INDEX idx_aff_pay_affiliate_id (affiliate_id),
  INDEX idx_aff_pay_status (status),
  INDEX idx_aff_pay_scheduled_for (scheduled_for)
);

-- Add FK for payout_id on affiliate_commissions (after affiliate_payouts exists)
ALTER TABLE affiliate_commissions 
ADD CONSTRAINT fk_aff_comm_payout 
FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id) ON DELETE SET NULL;

-- =====================================================
-- SITE CREDIT TABLES (Gift Card Ready)
-- =====================================================

-- 5. User credits (site credit balances)
CREATE TABLE IF NOT EXISTS user_credits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  lifetime_earned DECIMAL(10,2) DEFAULT 0.00,
  lifetime_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_credits_user_id (user_id)
);

-- 6. User credit transactions (ledger)
CREATE TABLE IF NOT EXISTS user_credit_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  transaction_type ENUM(
    'affiliate_commission',
    'affiliate_clawback',
    'purchase',
    'gift_card_load',
    'admin_adjustment',
    'refund_credit'
  ) NOT NULL,
  
  reference_type VARCHAR(50) NULL,
  reference_id BIGINT NULL,
  
  description VARCHAR(255),
  created_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_cred_tx_user_id (user_id),
  INDEX idx_user_cred_tx_type (transaction_type),
  INDEX idx_user_cred_tx_created_at (created_at)
);

-- =====================================================
-- ADMIN SETTINGS
-- =====================================================

-- 7. Affiliate settings (global admin settings - single row)
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id INT PRIMARY KEY DEFAULT 1,
  default_commission_rate DECIMAL(5,2) DEFAULT 20.00,
  payout_delay_days INT DEFAULT 30,
  min_payout_amount DECIMAL(10,2) DEFAULT 0.00,
  auto_enroll_promoters BOOLEAN DEFAULT TRUE,
  auto_enroll_artists BOOLEAN DEFAULT FALSE,
  auto_enroll_community BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by BIGINT NULL
);

-- Initialize with defaults
INSERT INTO affiliate_settings (id) VALUES (1) 
ON DUPLICATE KEY UPDATE id = 1;

-- =====================================================
-- TABLE MODIFICATIONS
-- =====================================================

-- 8. Add affiliate tracking to cart_items
ALTER TABLE cart_items 
ADD COLUMN affiliate_id BIGINT NULL,
ADD COLUMN affiliate_source ENUM('link', 'promoter_site', 'direct') DEFAULT 'direct';

ALTER TABLE cart_items ADD INDEX idx_cart_items_affiliate_id (affiliate_id);

ALTER TABLE cart_items 
ADD CONSTRAINT fk_cart_items_affiliate 
FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;

-- 9. Add affiliate tracking to order_items
ALTER TABLE order_items 
ADD COLUMN affiliate_id BIGINT NULL,
ADD COLUMN affiliate_source ENUM('link', 'promoter_site', 'direct') DEFAULT 'direct';

ALTER TABLE order_items ADD INDEX idx_order_items_affiliate_id (affiliate_id);

ALTER TABLE order_items 
ADD CONSTRAINT fk_order_items_affiliate 
FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;

-- 10. Add professional_affiliate permission to user_permissions
-- Allows community members to receive cash payouts instead of site credit
ALTER TABLE user_permissions 
ADD COLUMN professional_affiliate TINYINT(1) DEFAULT 0;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

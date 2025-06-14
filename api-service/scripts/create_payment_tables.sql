-- Payment System Database Schema
-- Phase 1: Core Payment Infrastructure Tables

-- Create Orders Table (doesn't exist yet)
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  status ENUM('pending', 'processing', 'paid', 'accepted', 'shipped', 'cancelled', 'refunded') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  platform_fee_amount DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stripe_payment_intent (stripe_payment_intent_id),
  INDEX idx_user_orders (user_id),
  INDEX idx_status (status)
);

-- Vendor Transactions Table
CREATE TABLE vendor_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  transaction_type ENUM('sale', 'commission', 'payout', 'refund', 'adjustment', 'subscription_charge') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NULL,
  commission_amount DECIMAL(10,2) NULL,
  stripe_transfer_id VARCHAR(255) NULL,
  payout_date DATE NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_vendor_payout (vendor_id, payout_date),
  INDEX idx_stripe_transfer (stripe_transfer_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_status (status)
);

-- Vendor Settings Table
CREATE TABLE vendor_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  payout_days INT DEFAULT 15,
  stripe_account_id VARCHAR(255) NULL,
  stripe_account_verified BOOLEAN DEFAULT FALSE,
  reverse_transfer_enabled BOOLEAN DEFAULT FALSE,
  subscription_payment_method ENUM('balance_first', 'card_only') DEFAULT 'card_only',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stripe_account (stripe_account_id),
  INDEX idx_verified (stripe_account_verified)
);

-- Manual Adjustments Table
CREATE TABLE manual_adjustments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  admin_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason_code VARCHAR(50) NOT NULL,
  internal_notes TEXT NULL,
  vendor_visible_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_vendor_adjustments (vendor_id),
  INDEX idx_admin_adjustments (admin_id),
  INDEX idx_reason_code (reason_code)
);

-- Subscription Management Table
CREATE TABLE vendor_subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_customer_id VARCHAR(255) NULL,
  plan_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('active', 'cancelled', 'past_due', 'unpaid') DEFAULT 'active',
  current_period_start DATE NULL,
  current_period_end DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stripe_subscription (stripe_subscription_id),
  INDEX idx_stripe_customer (stripe_customer_id),
  INDEX idx_vendor_status (vendor_id, status)
);

-- Order Items Table
CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  vendor_id BIGINT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order_vendor (order_id, vendor_id),
  INDEX idx_product (product_id),
  INDEX idx_vendor (vendor_id)
); 
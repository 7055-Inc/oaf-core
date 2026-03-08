-- Migration: Add stripe_refunds table for centralized refund tracking
-- Run this migration to support the admin refund system

CREATE TABLE IF NOT EXISTS `stripe_refunds` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `payment_intent_id` varchar(255) NOT NULL,
  `stripe_refund_id` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'succeeded',
  `reason` varchar(500) DEFAULT NULL,
  `payment_type` enum('checkout', 'app_fee', 'booth_fee', 'subscription', 'other') NOT NULL,
  `payment_id` bigint NOT NULL,
  `processed_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_intent` (`payment_intent_id`),
  KEY `idx_stripe_refund_id` (`stripe_refund_id`),
  KEY `idx_payment_type_id` (`payment_type`, `payment_id`),
  KEY `idx_processed_by` (`processed_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `stripe_refunds_ibfk_1` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

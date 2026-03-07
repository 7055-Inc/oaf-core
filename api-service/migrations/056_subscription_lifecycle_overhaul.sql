-- Migration 056: Subscription Lifecycle Overhaul
--
-- 1. Extend user_subscriptions.subscription_type ENUM with 'social' and 'crm'
-- 2. Add is_complimentary flag to user_subscriptions
-- 3. Add cancel_at_period_end, current_period_end, is_complimentary to site_addons
-- 4. Add cancel_at_period_end, current_period_end, is_complimentary to user_addons
-- 5. Add cancel_at_period_end, current_period_end, is_complimentary to crm_subscription_addons
--
-- Idempotent: safe to re-run if partially applied.

DELIMITER //

DROP PROCEDURE IF EXISTS run_migration_056//

CREATE PROCEDURE run_migration_056()
BEGIN

  -- 1. Extend subscription_type ENUM (MODIFY is idempotent)
  ALTER TABLE user_subscriptions
    MODIFY COLUMN subscription_type ENUM(
      'verified','marketplace','websites','shipping_labels','social','crm'
    ) DEFAULT 'verified';

  -- 2. Add is_complimentary to user_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'user_subscriptions' AND column_name = 'is_complimentary'
  ) THEN
    ALTER TABLE user_subscriptions
      ADD COLUMN is_complimentary TINYINT(1) DEFAULT 0 COMMENT 'Admin-granted free-for-life access' AFTER cancel_at_period_end;
  END IF;

  -- 3. Add columns to site_addons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'site_addons' AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE site_addons
      ADD COLUMN cancel_at_period_end TINYINT(1) DEFAULT 0 AFTER deactivated_at,
      ADD COLUMN current_period_end TIMESTAMP NULL DEFAULT NULL AFTER cancel_at_period_end,
      ADD COLUMN is_complimentary TINYINT(1) DEFAULT 0 COMMENT 'Admin-granted free-for-life access' AFTER current_period_end;
  END IF;

  -- 4. Add columns to user_addons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'user_addons' AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE user_addons
      ADD COLUMN cancel_at_period_end TINYINT(1) DEFAULT 0 AFTER deactivated_at,
      ADD COLUMN current_period_end TIMESTAMP NULL DEFAULT NULL AFTER cancel_at_period_end,
      ADD COLUMN is_complimentary TINYINT(1) DEFAULT 0 COMMENT 'Admin-granted free-for-life access' AFTER current_period_end;
  END IF;

  -- 5. Add columns to crm_subscription_addons
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'crm_subscription_addons' AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE crm_subscription_addons
      ADD COLUMN cancel_at_period_end TINYINT(1) DEFAULT 0 AFTER deactivated_at,
      ADD COLUMN current_period_end TIMESTAMP NULL DEFAULT NULL AFTER cancel_at_period_end,
      ADD COLUMN is_complimentary TINYINT(1) DEFAULT 0 COMMENT 'Admin-granted free-for-life access' AFTER current_period_end;
  END IF;

END//

DELIMITER ;

CALL run_migration_056();
DROP PROCEDURE IF EXISTS run_migration_056;

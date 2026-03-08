-- Migration 048: Standardize early connector table enums to match newer conventions
--
-- walmart_corporate_products was created before paused/rejected listing statuses
-- and syncing/failed sync statuses were adopted across all connectors (see 046, 047).
--
-- walmart_sync_logs and tiktok_sync_logs used a restrictive ENUM for 'operation'
-- while all newer connector sync_logs tables use VARCHAR(50). The service code
-- writes values like 'reject' that fall outside the old enum.
--
-- This migration brings the early tables in line with the standard set in 046+.

-- 1. walmart_corporate_products: add paused + rejected to listing_status
ALTER TABLE walmart_corporate_products
  MODIFY COLUMN listing_status
    ENUM('pending','listed','paused','removing','removed','cooldown','rejected')
    DEFAULT 'pending';

-- 2. walmart_corporate_products: add syncing + failed to sync_status (keep 'error' for existing rows)
ALTER TABLE walmart_corporate_products
  MODIFY COLUMN sync_status
    ENUM('pending','syncing','synced','failed','error')
    DEFAULT 'pending';

-- 3. walmart_sync_logs: widen operation from enum to varchar(50) to match newer tables
ALTER TABLE walmart_sync_logs
  MODIFY COLUMN operation VARCHAR(50) DEFAULT NULL;

-- 4. tiktok_sync_logs: same fix
ALTER TABLE tiktok_sync_logs
  MODIFY COLUMN operation VARCHAR(50) DEFAULT NULL;

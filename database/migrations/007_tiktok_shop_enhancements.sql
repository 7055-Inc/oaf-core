-- Migration 007: TikTok Shop API Integration Enhancements
-- Adds support for TikTok Shop External API Service
-- Created: 2026-02-08
-- Status: Changes already applied during development

-- This migration documents the database changes made for TikTok Shop API integration.
-- All changes have been applied incrementally during development.

-- ============================================
-- CHANGES SUMMARY (all already applied)
-- ============================================

-- 1. tiktok_product_data enhancements:
--    - Added: tiktok_sku_id VARCHAR(100) - TikTok's SKU identifier  
--    - Added: shop_id VARCHAR(100) - Multi-shop support
--    - Added: last_sync_error TEXT - Error tracking

-- 2. tiktok_user_shops enhancements:
--    - Added: app_key VARCHAR(255) - App credentials
--    - Added: token_refresh_count INT - Token refresh tracking
--    - Added: last_token_refresh_at TIMESTAMP
--    - Added: last_products_sync_at TIMESTAMP
--    - Added: last_orders_sync_at TIMESTAMP
--    - Added: last_inventory_sync_at TIMESTAMP

-- 3. tiktok_sync_logs enhancements:
--    - Added: shop_id VARCHAR(100) - Shop reference
--    - Added: duration_ms INT - Request duration
--    - Added: request_id VARCHAR(100) - Request tracking

-- 4. New table: tiktok_api_logs
--    - Logs all API requests/responses for debugging and audit

-- 5. New table: tiktok_webhooks
--    - Queue for TikTok webhook events (future use)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tiktok_product_data columns
SELECT 'tiktok_product_data columns' as check_name, COUNT(*) as column_count 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tiktok_product_data' 
  AND COLUMN_NAME IN ('tiktok_sku_id', 'shop_id', 'last_sync_error');

-- Verify tiktok_user_shops columns  
SELECT 'tiktok_user_shops columns' as check_name, COUNT(*) as column_count
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tiktok_user_shops' 
  AND COLUMN_NAME IN ('app_key', 'token_refresh_count', 'last_token_refresh_at', 
                      'last_products_sync_at', 'last_orders_sync_at', 'last_inventory_sync_at');

-- Verify new tables exist
SELECT 'tiktok_api_logs table' as check_name, COUNT(*) as exists_count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tiktok_api_logs';

SELECT 'tiktok_webhooks table' as check_name, COUNT(*) as exists_count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tiktok_webhooks';

-- ============================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================

-- When deploying to production:
-- 1. Review schema differences between staging and production
-- 2. Apply missing changes incrementally with proper testing
-- 3. Ensure all indexes are created for performance
-- 4. Test OAuth flow before announcing to users
-- 5. Monitor tiktok_api_logs for errors after deployment

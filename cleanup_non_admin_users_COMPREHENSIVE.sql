-- ========================================
-- COMPREHENSIVE USER CLEANUP SCRIPT
-- Database: oaf (10.128.0.31)
-- Date: 2025-11-05
-- Purpose: Delete ALL non-admin users and related data
-- ========================================
-- CRITICAL: This script preserves ONLY admin users (user_type = 'admin')
-- ALL other users (artists, promoters, community) will be DELETED
-- ========================================

-- STEP 1: VERIFICATION - Show what will be deleted
-- ========================================
SELECT '=== USERS TO BE DELETED ===' as info;
SELECT id, username, user_type, status, created_at
FROM users 
WHERE user_type != 'admin'
ORDER BY user_type, username;

SELECT '=== ADMIN USERS TO BE KEPT ===' as info;
SELECT id, username, user_type, status, created_at
FROM users 
WHERE user_type = 'admin'
ORDER BY username;

SELECT '=== SUMMARY ===' as info;
SELECT 
    user_type,
    COUNT(*) as count
FROM users 
GROUP BY user_type;

-- ========================================
-- STEP 2: DELETE DATA (UNCOMMENT TO RUN)
-- ========================================
-- Order matters! Delete in correct order to handle constraints

-- Start transaction for safety
-- START TRANSACTION;

-- Tables with NO ACTION / RESTRICT constraints - must delete first
-- ====================================================================

-- Delete announcements
-- DELETE FROM announcements WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete cart_collections
-- DELETE FROM cart_collections WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete coupons (created_by references)
-- UPDATE coupons SET created_by_vendor_id = NULL WHERE created_by_vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');
-- UPDATE coupons SET created_by_admin_id = NULL WHERE created_by_admin_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete event artist associations
-- DELETE FROM event_artists WHERE artist_id IN (SELECT id FROM users WHERE user_type != 'admin' AND user_type = 'artist');

-- Delete event application associations
-- UPDATE event_applications SET reviewed_by = NULL WHERE reviewed_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete events created/updated by non-admins
-- UPDATE events SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');
-- UPDATE events SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete saved_items
-- DELETE FROM saved_items WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete search_queries
-- DELETE FROM search_queries WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete shipping_policies
-- UPDATE shipping_policies SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete terms_versions
-- UPDATE terms_versions SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete user_acknowledgments
-- DELETE FROM user_acknowledgments WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete vendor_tax_summary
-- DELETE FROM vendor_tax_summary WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete promotions
-- UPDATE promotions SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');

-- Tables with CASCADE - will auto-delete (listed for documentation)
-- ====================================================================
-- These will automatically delete when users are deleted:
-- - admin_profiles
-- - api_keys  
-- - api_tokens
-- - articles
-- - artist_custom_events
-- - artist_jury_packets
-- - artist_personas
-- - artist_profiles
-- - artist_verification_applications
-- - artist_verification_status
-- - cart_items
-- - carts
-- - community_profiles
-- - coupon_products
-- - coupon_usage
-- - dashboard_layouts
-- - discounts
-- - email_log
-- - email_queue
-- - email_tracking
-- - event_applications
-- - event_artists
-- - event_notifications
-- - event_series
-- - event_templates
-- - events
-- - financial_settings
-- - manual_adjustments
-- - marketplace_applications
-- - marketplace_curation
-- - marketplace_permissions
-- - media_library
-- - order_item_tracking
-- - order_items
-- - orders
-- - pending_images
-- - products
-- - promoter_profiles
-- - promotion_invitations
-- - promotion_products
-- - promotion_usage
-- - refresh_tokens
-- - return_policies
-- - returns
-- - shipping_labels
-- - shipping_policies
-- - site_media
-- - sites
-- - tiktok_inventory_allocations
-- - tiktok_orders
-- - tiktok_product_data
-- - tiktok_returns
-- - tiktok_sync_logs
-- - tiktok_user_shops
-- - user_addons
-- - user_categories
-- - user_email_preference_log
-- - user_email_preferences
-- - user_logins
-- - user_permissions
-- - user_profiles
-- - user_subscriptions
-- - user_terms_acceptance
-- - user_types
-- - user_variation_types
-- - user_variation_values
-- - user_verifications
-- - variant_kinds
-- - vendor_settings
-- - vendor_ship_settings
-- - vendor_shipping_methods
-- - vendor_shipping_preferences
-- - vendor_sku_log
-- - vendor_subscriptions
-- - vendor_transactions
-- - wholesale_applications
-- - wp_artifacts

-- ========================================
-- STEP 3: DELETE USERS
-- ========================================
-- Finally, delete the non-admin users
-- This will CASCADE delete all related records

-- DELETE FROM users WHERE user_type != 'admin';

-- Commit transaction
-- COMMIT;

-- ========================================
-- STEP 4: VERIFICATION
-- ========================================
-- Uncomment to verify cleanup

-- SELECT '=== CLEANUP COMPLETE ===' as status;

-- SELECT 'Remaining users by type:' as info;
-- SELECT user_type, COUNT(*) as count 
-- FROM users 
-- GROUP BY user_type;

-- SELECT 'Total users remaining:' as info;
-- SELECT COUNT(*) as total FROM users;

-- SELECT 'Remaining admin users:' as info;
-- SELECT id, username, user_type, status 
-- FROM users 
-- WHERE user_type = 'admin'
-- ORDER BY username;

-- Check for orphaned records (should be 0)
-- SELECT 'Orphaned artist_profiles:' as check_type, COUNT(*) as count FROM artist_profiles WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT 'Orphaned vendor_settings:' as check_type, COUNT(*) as count FROM vendor_settings WHERE vendor_id NOT IN (SELECT id FROM users);
-- SELECT 'Orphaned products:' as check_type, COUNT(*) as count FROM products WHERE vendor_id NOT IN (SELECT id FROM users);
-- SELECT 'Orphaned orders:' as check_type, COUNT(*) as count FROM orders WHERE user_id NOT IN (SELECT id FROM users);


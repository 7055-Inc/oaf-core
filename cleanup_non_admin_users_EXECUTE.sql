-- ========================================
-- EXECUTING USER CLEANUP
-- Database: oaf (10.128.0.31)
-- Date: 2025-11-05
-- ========================================

START TRANSACTION;

-- Delete tables with NO ACTION / RESTRICT constraints first
DELETE FROM announcements WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');
DELETE FROM cart_collections WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

UPDATE coupons SET created_by_vendor_id = NULL WHERE created_by_vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');
UPDATE coupons SET created_by_admin_id = NULL WHERE created_by_admin_id IN (SELECT id FROM users WHERE user_type != 'admin');

DELETE FROM event_artists WHERE artist_id IN (SELECT id FROM users WHERE user_type != 'admin');

UPDATE event_applications SET jury_reviewed_by = NULL WHERE jury_reviewed_by IN (SELECT id FROM users WHERE user_type != 'admin');

UPDATE events SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');
UPDATE events SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE user_type != 'admin');

DELETE FROM saved_items WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');
DELETE FROM search_queries WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

UPDATE shipping_policies SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');
UPDATE terms_versions SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE user_type != 'admin');

DELETE FROM user_acknowledgments WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');
DELETE FROM vendor_tax_summary WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');

UPDATE promotions SET created_by_admin_id = NULL WHERE created_by_admin_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete product-related tables with NO ACTION constraints BEFORE deleting products
DELETE FROM product_categories WHERE product_id IN (SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin'));
DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin'));
DELETE FROM product_shipping WHERE product_id IN (SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin'));
DELETE FROM sales WHERE product_id IN (SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin'));
DELETE FROM vendor_sku_log WHERE product_id IN (SELECT id FROM products WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin'));

-- Handle products self-referencing constraint
UPDATE products SET parent_id = NULL WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Now delete the users - this will CASCADE delete all related records including products
DELETE FROM users WHERE user_type != 'admin';

COMMIT;

-- Verification
SELECT '=== CLEANUP COMPLETE ===' as status;

SELECT 'Remaining users by type:' as info;
SELECT user_type, COUNT(*) as count 
FROM users 
GROUP BY user_type;

SELECT 'Total users remaining:' as info;
SELECT COUNT(*) as total FROM users;

SELECT 'Remaining admin users:' as info;
SELECT id, username, user_type, status 
FROM users 
WHERE user_type = 'admin'
ORDER BY username;

-- Check for orphaned records
SELECT 'Orphaned artist_profiles:' as check_type, COUNT(*) as count FROM artist_profiles WHERE user_id NOT IN (SELECT id FROM users);
SELECT 'Orphaned vendor_settings:' as check_type, COUNT(*) as count FROM vendor_settings WHERE vendor_id NOT IN (SELECT id FROM users);
SELECT 'Orphaned products:' as check_type, COUNT(*) as count FROM products WHERE vendor_id NOT IN (SELECT id FROM users);
SELECT 'Orphaned orders:' as check_type, COUNT(*) as count FROM orders WHERE user_id NOT IN (SELECT id FROM users);
SELECT 'Orphaned carts:' as check_type, COUNT(*) as count FROM carts WHERE user_id NOT IN (SELECT id FROM users) AND user_id IS NOT NULL;


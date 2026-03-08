-- Migration: Remove Vendor Custom Policies
-- Date: 2026-01-19
-- Description: Removes vendor-level shipping and return policies
--              Return policies are now per-product (products.allow_returns field)
--              Shipping policies are being deprecated in favor of per-product handling
--
-- IMPORTANT: This keeps the DEFAULT policies (user_id IS NULL) as platform fallbacks
--            Only removes VENDOR custom policies (user_id IS NOT NULL)

-- ============================================================================
-- STEP 1: Backup vendor policies (optional - run this first to save data)
-- ============================================================================

-- Create backup tables (uncomment if you want to preserve data)
-- CREATE TABLE shipping_policies_backup AS SELECT * FROM shipping_policies WHERE user_id IS NOT NULL;
-- CREATE TABLE return_policies_backup AS SELECT * FROM return_policies WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Remove vendor custom shipping policies
-- ============================================================================

-- Archive all vendor shipping policies (soft delete)
UPDATE shipping_policies 
SET status = 'archived' 
WHERE user_id IS NOT NULL AND status = 'active';

-- Or hard delete vendor policies (uncomment to permanently remove):
-- DELETE FROM shipping_policies WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Remove vendor custom return policies
-- ============================================================================

-- Archive all vendor return policies (soft delete)
UPDATE return_policies 
SET status = 'archived' 
WHERE user_id IS NOT NULL AND status = 'active';

-- Or hard delete vendor policies (uncomment to permanently remove):
-- DELETE FROM return_policies WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Verify default policies still exist
-- ============================================================================

-- Check default shipping policy exists
SELECT 'Default Shipping Policy' as policy_type, COUNT(*) as count 
FROM shipping_policies 
WHERE user_id IS NULL AND status = 'active';

-- Check default return policy exists  
SELECT 'Default Return Policy' as policy_type, COUNT(*) as count
FROM return_policies 
WHERE user_id IS NULL AND status = 'active';

-- ============================================================================
-- OPTIONAL: Complete table removal (only after confirming no dependencies)
-- ============================================================================

-- WARNING: Only run these after verifying all code references are removed
-- and you're certain you don't need the default policies anymore

-- DROP TABLE IF EXISTS shipping_policies;
-- DROP TABLE IF EXISTS return_policies;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To restore archived policies:
-- UPDATE shipping_policies SET status = 'active' WHERE user_id IS NOT NULL AND status = 'archived';
-- UPDATE return_policies SET status = 'active' WHERE user_id IS NOT NULL AND status = 'archived';

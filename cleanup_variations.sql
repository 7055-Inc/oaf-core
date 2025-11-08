-- ============================================================
-- Cleanup ALL Product Variation Data
-- This removes all variation types, values, and product links
-- to prepare for a clean re-import from WordPress
-- ============================================================

START TRANSACTION;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete all product-variation links
DELETE FROM oaf.product_variations;

-- Delete all variation values
DELETE FROM oaf.user_variation_values;

-- Delete all variation types
DELETE FROM oaf.user_variation_types;

-- Reset auto-increment
ALTER TABLE oaf.user_variation_types AUTO_INCREMENT = 1;
ALTER TABLE oaf.user_variation_values AUTO_INCREMENT = 1;
ALTER TABLE oaf.product_variations AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

-- Verification
SELECT 
    (SELECT COUNT(*) FROM oaf.user_variation_types) as variation_types,
    (SELECT COUNT(*) FROM oaf.user_variation_values) as variation_values,
    (SELECT COUNT(*) FROM oaf.product_variations) as product_variations;

SELECT 'Variation data cleanup complete' as status;


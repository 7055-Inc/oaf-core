-- ONE-TIME CLEANUP: Remove test categories
-- This script removes all test categories from the Brakebee database
-- Run this ONCE before running the updated migration script

START TRANSACTION;

-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Delete all product-category assignments
DELETE FROM oaf.product_categories;

-- Step 2: Delete all categories
DELETE FROM oaf.categories;

-- Step 3: Reset auto-increment to start fresh
ALTER TABLE oaf.categories AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

-- Verification
SELECT 'Categories deleted:' as status;
SELECT COUNT(*) as remaining_categories FROM oaf.categories;
SELECT COUNT(*) as remaining_assignments FROM oaf.product_categories;


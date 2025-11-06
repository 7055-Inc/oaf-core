-- ONE-TIME CLEANUP: Remove all products
-- This clears products to re-import with variations

START TRANSACTION;

-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Delete all product-related data
DELETE FROM oaf.product_categories;
DELETE FROM oaf.product_images;
DELETE FROM oaf.product_shipping;
DELETE FROM oaf.order_items;
DELETE FROM oaf.sales;
DELETE FROM oaf.vendor_sku_log;
DELETE FROM oaf.products;

-- Step 2: Reset auto-increment
ALTER TABLE oaf.products AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

-- Verification
SELECT 'Products deleted:' as status;
SELECT COUNT(*) as remaining_products FROM oaf.products;
SELECT COUNT(*) as remaining_product_categories FROM oaf.product_categories;


-- Migration Script: STEP 1 - User Accounts
-- Source: wordpress_import database
-- Target: oaf database
-- Date: 2025-11-05
-- Purpose: Import all WordPress user accounts with correct user types

START TRANSACTION;

-- Step 1: Insert all user records
INSERT INTO oaf.users (
    username,
    password,
    email_verified,
    user_type,
    status,
    wp_id,
    created_at,
    updated_at
) 
SELECT 
    u.user_email as username,
    u.user_pass as password,
    CASE WHEN u.user_email LIKE '%@%' THEN 'yes' ELSE 'no' END as email_verified,
    CASE 
        WHEN um.meta_value LIKE '%7055_vendor%' OR um.meta_value LIKE '%OAF_Artist%' THEN 'artist'
        WHEN um.meta_value LIKE '%administrator%' THEN 'admin'
        WHEN um.meta_value LIKE '%promoter%' THEN 'promoter'
        ELSE 'community'
    END as user_type,
    CASE 
        WHEN u.user_status = 0 THEN 'active'
        WHEN u.user_status = 1 THEN 'suspended'
        ELSE 'active'
    END as status,
    u.ID as wp_id,
    u.user_registered as created_at,
    NOW() as updated_at
FROM wordpress_import.wp_users u
LEFT JOIN wordpress_import.wp_usermeta um ON u.ID = um.user_id AND um.meta_key = 'wp_capabilities'
WHERE u.ID NOT IN (SELECT COALESCE(wp_id, 0) FROM oaf.users WHERE wp_id IS NOT NULL)
AND CAST(u.user_email AS CHAR CHARACTER SET utf8mb4) NOT IN (SELECT CAST(username AS CHAR CHARACTER SET utf8mb4) FROM oaf.users)
AND u.user_login != '';

-- Step 2: Insert user_profiles for all imported users
INSERT INTO oaf.user_profiles (
    user_id,
    first_name,
    last_name,
    display_name
)
SELECT 
    u.id as user_id,
    COALESCE(MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END), '') as first_name,
    COALESCE(MAX(CASE WHEN um.meta_key = 'last_name' THEN um.meta_value END), '') as last_name,
    COALESCE(MAX(CASE WHEN um.meta_key = 'nickname' THEN um.meta_value END), u.username) as display_name
FROM oaf.users u
JOIN wordpress_import.wp_users wp_user ON u.wp_id = wp_user.ID
LEFT JOIN wordpress_import.wp_usermeta um ON wp_user.ID = um.user_id 
    AND um.meta_key IN ('first_name', 'last_name', 'nickname')
WHERE u.wp_id IS NOT NULL
AND u.id NOT IN (SELECT user_id FROM oaf.user_profiles)
GROUP BY u.id, u.username;

-- Step 3: Insert artist profiles (using pre-processed clean data)
-- NOTE: Run prepare_artist_data.js FIRST to create the clean lookup table
INSERT INTO oaf.artist_profiles (
    user_id,
    business_name,
    studio_address_line1,
    studio_address_line2,
    studio_city,
    studio_state,
    studio_zip,
    business_phone,
    business_website,
    business_social_facebook,
    business_social_instagram,
    business_social_twitter,
    business_social_pinterest,
    artist_biography,
    customer_service_email,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    COALESCE(pc.business_name, CONCAT(u.username, '''s Art')) as business_name,
    COALESCE(pc.street_1, '') as studio_address_line1,
    COALESCE(pc.street_2, '') as studio_address_line2,
    COALESCE(pc.city, '') as studio_city,
    COALESCE(pc.state, '') as studio_state,
    COALESCE(pc.zip, '') as studio_zip,
    COALESCE(pc.phone, '') as business_phone,
    COALESCE(pc.website, '') as business_website,
    COALESCE(pc.facebook, '') as business_social_facebook,
    COALESCE(pc.instagram, '') as business_social_instagram,
    COALESCE(pc.twitter, '') as business_social_twitter,
    COALESCE(pc.pinterest, '') as business_social_pinterest,
    COALESCE(pc.biography, '') as artist_biography,
    wp_user.user_email as customer_service_email,
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u
JOIN wordpress_import.wp_users wp_user ON u.wp_id = wp_user.ID
LEFT JOIN wordpress_import.artist_profiles_clean pc ON wp_user.ID = pc.wp_user_id
WHERE u.user_type = 'artist'
AND u.wp_id IS NOT NULL
AND u.id NOT IN (SELECT user_id FROM oaf.artist_profiles);

-- Step 4: Insert vendor settings with Stripe Connect data
INSERT INTO oaf.vendor_settings (
    vendor_id,
    commission_rate,
    payout_days,
    stripe_account_id,
    stripe_account_verified,
    created_at,
    updated_at
)
SELECT 
    u.id as vendor_id,
    15.00 as commission_rate,
    15 as payout_days,
    COALESCE(sa.meta_value, '') as stripe_account_id,
    CASE WHEN sa.meta_value IS NOT NULL AND sa.meta_value != '' THEN 1 ELSE 0 END as stripe_account_verified,
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u
JOIN wordpress_import.wp_users wp_user ON u.wp_id = wp_user.ID
LEFT JOIN wordpress_import.wp_usermeta sa ON wp_user.ID = sa.user_id AND sa.meta_key = '_stripe_account'
WHERE u.user_type = 'artist'
AND u.wp_id IS NOT NULL
AND u.id NOT IN (SELECT vendor_id FROM oaf.vendor_settings);

-- Step 5: Insert products

-- Step 5a: Add wp_id column to products table if it doesn't exist
SET @sql_add_product_wp_id = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'oaf' 
     AND TABLE_NAME = 'products' 
     AND COLUMN_NAME = 'wp_id') = 0,
    'ALTER TABLE oaf.products ADD COLUMN wp_id INT NULL UNIQUE AFTER id',
    'SELECT "Column wp_id already exists in products"'
);
PREPARE stmt FROM @sql_add_product_wp_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5b: Insert products
INSERT INTO oaf.products (
    name,
    price,
    vendor_id,
    description,
    short_description,
    track_inventory,
    category_id,
    sku,
    status,
    width,
    height,
    depth,
    weight,
    dimension_unit,
    weight_unit,
    marketplace_enabled,
    wp_id,
    created_at,
    created_by,
    updated_at
)
SELECT 
    LEFT(p.post_title, 100) as name,
    COALESCE(CAST(MAX(pm_price.meta_value) AS DECIMAL(10,2)), 0) as price,
    u.id as vendor_id,
    p.post_content as description,
    p.post_excerpt as short_description,
    CASE WHEN MAX(pm_manage_stock.meta_value) = 'yes' THEN 1 ELSE 0 END as track_inventory,
    1 as category_id,
    CONCAT(COALESCE(MAX(pm_sku.meta_value), CONCAT('WP-', p.ID)), '-', p.ID) as sku,
    CASE 
        WHEN p.post_status = 'publish' AND MAX(pm_stock_status.meta_value) = 'instock' THEN 'active'
        WHEN p.post_status = 'publish' AND MAX(pm_stock_status.meta_value) = 'outofstock' THEN 'hidden'
        WHEN p.post_status = 'draft' THEN 'draft'
        ELSE 'hidden'
    END as status,
    CASE WHEN MAX(pm_width.meta_value) IS NOT NULL AND MAX(pm_width.meta_value) != '' THEN CAST(MAX(pm_width.meta_value) AS DECIMAL(10,2)) ELSE NULL END as width,
    CASE WHEN MAX(pm_height.meta_value) IS NOT NULL AND MAX(pm_height.meta_value) != '' THEN CAST(MAX(pm_height.meta_value) AS DECIMAL(10,2)) ELSE NULL END as height,
    CASE WHEN MAX(pm_length.meta_value) IS NOT NULL AND MAX(pm_length.meta_value) != '' THEN CAST(MAX(pm_length.meta_value) AS DECIMAL(10,2)) ELSE NULL END as depth,
    CASE WHEN MAX(pm_weight.meta_value) IS NOT NULL AND MAX(pm_weight.meta_value) != '' THEN CAST(MAX(pm_weight.meta_value) AS DECIMAL(10,2)) ELSE NULL END as weight,
    'in' as dimension_unit,
    'lbs' as weight_unit,
    1 as marketplace_enabled,
    p.ID as wp_id,
    p.post_date as created_at,
    u.id as created_by,
    p.post_modified as updated_at
FROM wordpress_import.wp_posts p
JOIN oaf.users u ON p.post_author = u.wp_id
LEFT JOIN wordpress_import.wp_postmeta pm_price ON p.ID = pm_price.post_id AND pm_price.meta_key COLLATE utf8mb4_unicode_520_ci = '_price'
LEFT JOIN wordpress_import.wp_postmeta pm_sku ON p.ID = pm_sku.post_id AND pm_sku.meta_key COLLATE utf8mb4_unicode_520_ci = '_sku'
LEFT JOIN wordpress_import.wp_postmeta pm_manage_stock ON p.ID = pm_manage_stock.post_id AND pm_manage_stock.meta_key COLLATE utf8mb4_unicode_520_ci = '_manage_stock'
LEFT JOIN wordpress_import.wp_postmeta pm_stock_status ON p.ID = pm_stock_status.post_id AND pm_stock_status.meta_key COLLATE utf8mb4_unicode_520_ci = '_stock_status'
LEFT JOIN wordpress_import.wp_postmeta pm_width ON p.ID = pm_width.post_id AND pm_width.meta_key COLLATE utf8mb4_unicode_520_ci = '_width'
LEFT JOIN wordpress_import.wp_postmeta pm_height ON p.ID = pm_height.post_id AND pm_height.meta_key COLLATE utf8mb4_unicode_520_ci = '_height'
LEFT JOIN wordpress_import.wp_postmeta pm_length ON p.ID = pm_length.post_id AND pm_length.meta_key COLLATE utf8mb4_unicode_520_ci = '_length'
LEFT JOIN wordpress_import.wp_postmeta pm_weight ON p.ID = pm_weight.post_id AND pm_weight.meta_key COLLATE utf8mb4_unicode_520_ci = '_weight'
WHERE p.post_type = 'product'
AND p.post_status IN ('publish', 'draft')
AND u.wp_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM oaf.products pr 
    WHERE pr.sku COLLATE utf8mb4_unicode_520_ci = CONCAT(COALESCE((SELECT meta_value FROM wordpress_import.wp_postmeta WHERE post_id = p.ID AND meta_key COLLATE utf8mb4_unicode_520_ci = '_sku' LIMIT 1), CONCAT('WP-', p.ID)), '-', p.ID)
)
GROUP BY p.ID, u.id, p.post_title, p.post_content, p.post_excerpt, p.post_status, p.post_date, p.post_modified;

-- Step 5c: Insert product variations (children)
INSERT INTO oaf.products (
    name,
    price,
    vendor_id,
    description,
    parent_id,
    track_inventory,
    category_id,
    sku,
    status,
    width,
    height,
    depth,
    weight,
    dimension_unit,
    weight_unit,
    marketplace_enabled,
    wp_id,
    created_at,
    created_by,
    updated_at
)
SELECT 
    pv.post_title as name,
    COALESCE(CAST(MAX(pm_price.meta_value) AS DECIMAL(10,2)), 0) as price,
    u.id as vendor_id,
    COALESCE(MAX(pm_description.meta_value), pp.post_content) as description,
    parent_product.id as parent_id,
    CASE WHEN MAX(pm_manage_stock.meta_value) = 'yes' THEN 1 ELSE 0 END as track_inventory,
    1 as category_id,
    CASE 
        WHEN MAX(pm_sku.meta_value) IS NOT NULL AND MAX(pm_sku.meta_value) != '' 
        THEN MAX(pm_sku.meta_value)
        ELSE CONCAT('WP-VAR-', pv.ID)
    END as sku,
    CASE 
        WHEN pv.post_status = 'publish' AND MAX(pm_stock_status.meta_value) = 'instock' THEN 'active'
        WHEN pv.post_status = 'publish' AND MAX(pm_stock_status.meta_value) = 'outofstock' THEN 'hidden'
        ELSE 'hidden'
    END as status,
    CASE WHEN MAX(pm_width.meta_value) IS NOT NULL AND MAX(pm_width.meta_value) != '' THEN CAST(MAX(pm_width.meta_value) AS DECIMAL(10,2)) ELSE NULL END as width,
    CASE WHEN MAX(pm_height.meta_value) IS NOT NULL AND MAX(pm_height.meta_value) != '' THEN CAST(MAX(pm_height.meta_value) AS DECIMAL(10,2)) ELSE NULL END as height,
    CASE WHEN MAX(pm_length.meta_value) IS NOT NULL AND MAX(pm_length.meta_value) != '' THEN CAST(MAX(pm_length.meta_value) AS DECIMAL(10,2)) ELSE NULL END as depth,
    CASE WHEN MAX(pm_weight.meta_value) IS NOT NULL AND MAX(pm_weight.meta_value) != '' THEN CAST(MAX(pm_weight.meta_value) AS DECIMAL(10,2)) ELSE NULL END as weight,
    'in' as dimension_unit,
    'lbs' as weight_unit,
    1 as marketplace_enabled,
    pv.ID as wp_id,
    pv.post_date as created_at,
    u.id as created_by,
    pv.post_modified as updated_at
FROM wordpress_import.wp_posts pv
JOIN wordpress_import.wp_posts pp ON pv.post_parent = pp.ID
JOIN oaf.users u ON pp.post_author = u.wp_id
JOIN oaf.products parent_product ON parent_product.wp_id = pp.ID
LEFT JOIN wordpress_import.wp_postmeta pm_price ON pv.ID = pm_price.post_id AND pm_price.meta_key COLLATE utf8mb4_unicode_520_ci = '_price'
LEFT JOIN wordpress_import.wp_postmeta pm_sku ON pv.ID = pm_sku.post_id AND pm_sku.meta_key COLLATE utf8mb4_unicode_520_ci = '_sku'
LEFT JOIN wordpress_import.wp_postmeta pm_manage_stock ON pv.ID = pm_manage_stock.post_id AND pm_manage_stock.meta_key COLLATE utf8mb4_unicode_520_ci = '_manage_stock'
LEFT JOIN wordpress_import.wp_postmeta pm_stock_status ON pv.ID = pm_stock_status.post_id AND pm_stock_status.meta_key COLLATE utf8mb4_unicode_520_ci = '_stock_status'
LEFT JOIN wordpress_import.wp_postmeta pm_width ON pv.ID = pm_width.post_id AND pm_width.meta_key COLLATE utf8mb4_unicode_520_ci = '_width'
LEFT JOIN wordpress_import.wp_postmeta pm_height ON pv.ID = pm_height.post_id AND pm_height.meta_key COLLATE utf8mb4_unicode_520_ci = '_height'
LEFT JOIN wordpress_import.wp_postmeta pm_length ON pv.ID = pm_length.post_id AND pm_length.meta_key COLLATE utf8mb4_unicode_520_ci = '_length'
LEFT JOIN wordpress_import.wp_postmeta pm_weight ON pv.ID = pm_weight.post_id AND pm_weight.meta_key COLLATE utf8mb4_unicode_520_ci = '_weight'
LEFT JOIN wordpress_import.wp_postmeta pm_description ON pv.ID = pm_description.post_id AND pm_description.meta_key COLLATE utf8mb4_unicode_520_ci = '_variation_description'
WHERE pv.post_type = 'product_variation'
AND pv.post_status = 'publish'
AND u.wp_id IS NOT NULL
AND parent_product.wp_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM oaf.products pr 
    WHERE pr.wp_id = pv.ID
)
GROUP BY pv.ID, u.id, pv.post_title, pv.post_parent, pp.post_content, pv.post_status, pv.post_date, pv.post_modified, parent_product.id;

-- Step 6: Insert orders
INSERT INTO oaf.orders (
    user_id,
    status,
    total_amount,
    shipping_amount,
    tax_amount,
    currency,
    created_at,
    updated_at,
    marketplace_source,
    external_order_id
)
SELECT 
    u.id as user_id,
    CASE 
        WHEN p.post_status = 'wc-completed' THEN 'paid'
        WHEN p.post_status = 'wc-processing' THEN 'processing'
        WHEN p.post_status = 'wc-pending' THEN 'pending'
        WHEN p.post_status = 'wc-cancelled' THEN 'cancelled'
        WHEN p.post_status = 'wc-refunded' THEN 'refunded'
        WHEN p.post_status = 'wc-failed' THEN 'cancelled'
        ELSE 'pending'
    END as status,
    COALESCE(CAST(MAX(pm_total.meta_value) AS DECIMAL(10,2)), 0) as total_amount,
    COALESCE(CAST(MAX(pm_shipping.meta_value) AS DECIMAL(10,2)), 0) as shipping_amount,
    COALESCE(CAST(MAX(pm_tax.meta_value) AS DECIMAL(10,2)), 0) as tax_amount,
    COALESCE(MAX(pm_currency.meta_value), 'USD') as currency,
    p.post_date as created_at,
    p.post_modified as updated_at,
    'oaf' as marketplace_source,
    CONCAT('WP-', p.ID) as external_order_id
FROM wordpress_import.wp_posts p
LEFT JOIN wordpress_import.wp_postmeta pm_customer ON p.ID = pm_customer.post_id AND pm_customer.meta_key COLLATE utf8mb4_unicode_520_ci = '_customer_user'
JOIN oaf.users u ON CAST(pm_customer.meta_value AS UNSIGNED) = u.wp_id
LEFT JOIN wordpress_import.wp_postmeta pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key COLLATE utf8mb4_unicode_520_ci = '_order_total'
LEFT JOIN wordpress_import.wp_postmeta pm_shipping ON p.ID = pm_shipping.post_id AND pm_shipping.meta_key COLLATE utf8mb4_unicode_520_ci = '_order_shipping'
LEFT JOIN wordpress_import.wp_postmeta pm_tax ON p.ID = pm_tax.post_id AND pm_tax.meta_key COLLATE utf8mb4_unicode_520_ci = '_order_tax'
LEFT JOIN wordpress_import.wp_postmeta pm_currency ON p.ID = pm_currency.post_id AND pm_currency.meta_key COLLATE utf8mb4_unicode_520_ci = '_order_currency'
WHERE p.post_type = 'shop_order'
AND u.wp_id IS NOT NULL
AND p.ID NOT IN (
    SELECT CAST(SUBSTRING_INDEX(o.external_order_id, '-', -1) AS UNSIGNED)
    FROM oaf.orders o
    WHERE o.external_order_id LIKE 'WP-%'
)
GROUP BY p.ID, u.id, p.post_status, p.post_date, p.post_modified;

-- Step 7: Insert events
INSERT INTO oaf.events (
    promoter_id,
    event_type_id,
    title,
    description,
    short_description,
    event_status,
    start_date,
    end_date,
    application_deadline,
    venue_name,
    venue_address,
    venue_city,
    venue_state,
    venue_zip,
    venue_country,
    admission_fee,
    booth_fee,
    seo_title,
    created_at,
    created_by,
    updated_at,
    updated_by
)
SELECT 
    u.id as promoter_id,
    2 as event_type_id,
    p.post_title as title,
    p.post_content as description,
    p.post_excerpt as short_description,
    CASE 
        WHEN p.post_status = 'publish' THEN 'active'
        WHEN p.post_status = 'draft' THEN 'draft'
        ELSE 'draft'
    END as event_status,
    CASE WHEN MAX(pm_start.meta_value) IS NOT NULL AND MAX(pm_start.meta_value) != '' 
         THEN DATE(MAX(pm_start.meta_value)) 
         ELSE NULL 
    END as start_date,
    CASE WHEN MAX(pm_end.meta_value) IS NOT NULL AND MAX(pm_end.meta_value) != '' 
         THEN DATE(MAX(pm_end.meta_value)) 
         ELSE NULL 
    END as end_date,
    CASE WHEN MAX(pm_due.meta_value) IS NOT NULL AND MAX(pm_due.meta_value) != '' 
         THEN DATE(MAX(pm_due.meta_value)) 
         ELSE NULL 
    END as application_deadline,
    MAX(pm_venue.meta_value) as venue_name,
    CONCAT(
        COALESCE(MAX(pm_address.meta_value), ''),
        CASE WHEN MAX(pm_address2.meta_value) IS NOT NULL AND MAX(pm_address2.meta_value) != '' 
             THEN CONCAT(' ', MAX(pm_address2.meta_value)) 
             ELSE '' 
        END
    ) as venue_address,
    MAX(pm_city.meta_value) as venue_city,
    MAX(pm_state.meta_value) as venue_state,
    MAX(pm_zip.meta_value) as venue_zip,
    'USA' as venue_country,
    CASE 
        WHEN MAX(pm_cost.meta_value) REGEXP '^[0-9.]+$' THEN CAST(MAX(pm_cost.meta_value) AS DECIMAL(10,2))
        ELSE 0.00
    END as admission_fee,
    CASE 
        WHEN MAX(pm_booth.meta_value) REGEXP '^[0-9.]+$' THEN CAST(MAX(pm_booth.meta_value) AS DECIMAL(10,2))
        ELSE 0.00
    END as booth_fee,
    CONCAT('WP-', p.ID) as seo_title,
    p.post_date as created_at,
    u.id as created_by,
    p.post_modified as updated_at,
    u.id as updated_by
FROM wordpress_import.wp_posts p
LEFT JOIN wordpress_import.wp_postmeta pm_author ON p.ID = pm_author.post_id AND pm_author.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_promoter'
JOIN oaf.users u ON COALESCE(CAST(pm_author.meta_value AS UNSIGNED), p.post_author) = u.wp_id
LEFT JOIN wordpress_import.wp_postmeta pm_start ON p.ID = pm_start.post_id AND pm_start.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_start'
LEFT JOIN wordpress_import.wp_postmeta pm_end ON p.ID = pm_end.post_id AND pm_end.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_end'
LEFT JOIN wordpress_import.wp_postmeta pm_due ON p.ID = pm_due.post_id AND pm_due.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_ei_due_date'
LEFT JOIN wordpress_import.wp_postmeta pm_venue ON p.ID = pm_venue.post_id AND pm_venue.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_venue'
LEFT JOIN wordpress_import.wp_postmeta pm_address ON p.ID = pm_address.post_id AND pm_address.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_address'
LEFT JOIN wordpress_import.wp_postmeta pm_address2 ON p.ID = pm_address2.post_id AND pm_address2.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_address2'
LEFT JOIN wordpress_import.wp_postmeta pm_city ON p.ID = pm_city.post_id AND pm_city.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_city'
LEFT JOIN wordpress_import.wp_postmeta pm_state ON p.ID = pm_state.post_id AND pm_state.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_state'
LEFT JOIN wordpress_import.wp_postmeta pm_zip ON p.ID = pm_zip.post_id AND pm_zip.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_zip'
LEFT JOIN wordpress_import.wp_postmeta pm_cost ON p.ID = pm_cost.post_id AND pm_cost.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_cost'
LEFT JOIN wordpress_import.wp_postmeta pm_booth ON p.ID = pm_booth.post_id AND pm_booth.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_ei_booth_fee'
WHERE p.post_type = '7055_event'
AND u.wp_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM wordpress_import.wp_postmeta pm 
    WHERE pm.post_id = p.ID 
    AND pm.meta_key COLLATE utf8mb4_unicode_520_ci = '_event_start' 
    AND pm.meta_value IS NOT NULL 
    AND pm.meta_value != ''
)
AND p.ID NOT IN (
    SELECT CAST(SUBSTRING_INDEX(e.seo_title, 'WP-', -1) AS UNSIGNED)
    FROM oaf.events e
    WHERE e.seo_title LIKE 'WP-%'
)
GROUP BY p.ID, u.id, p.post_title, p.post_content, p.post_excerpt, p.post_status, p.post_date, p.post_modified;

-- Step 8: Insert order items (using pre-processed clean data)
-- NOTE: Run prepare_order_items.js FIRST to create the clean lookup table
INSERT INTO oaf.order_items (
    order_id,
    product_id,
    vendor_id,
    quantity,
    price,
    commission_rate,
    commission_amount,
    product_name,
    created_at
)
SELECT 
    oic.oaf_order_id as order_id,
    oic.oaf_product_id as product_id,
    pr.vendor_id,
    oic.quantity,
    oic.line_total as price,
    oic.commission_rate,
    oic.line_total * oic.commission_rate / 100 as commission_amount,
    oic.product_name,
    o.created_at
FROM wordpress_import.order_items_clean oic
JOIN oaf.orders o ON oic.oaf_order_id = o.id
JOIN oaf.products pr ON oic.oaf_product_id = pr.id
WHERE NOT EXISTS (
    SELECT 1 FROM oaf.order_items oit 
    WHERE oit.order_id = oic.oaf_order_id
    AND oit.product_id = oic.oaf_product_id
    AND oit.product_name = oic.product_name
);

-- Step 9: Import WordPress product categories

-- Step 9a: Add wp_term_id column to categories table if it doesn't exist
SET @sql_add_column = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'oaf' 
     AND TABLE_NAME = 'categories' 
     AND COLUMN_NAME = 'wp_term_id') = 0,
    'ALTER TABLE oaf.categories ADD COLUMN wp_term_id INT NULL UNIQUE AFTER description',
    'SELECT "Column wp_term_id already exists"'
);
PREPARE stmt FROM @sql_add_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 9b: Import categories from WordPress (parent categories first, then children)
-- Insert parent categories (parent = 0)
INSERT INTO oaf.categories (
    name,
    parent_id,
    description,
    wp_term_id
)
SELECT 
    t.name,
    NULL as parent_id,
    tt.description,
    t.term_id as wp_term_id
FROM wordpress_import.wp_terms t
JOIN wordpress_import.wp_term_taxonomy tt ON t.term_id = tt.term_id
WHERE tt.taxonomy = 'product_cat'
AND tt.parent = 0
AND NOT EXISTS (
    SELECT 1 FROM oaf.categories c WHERE c.wp_term_id = t.term_id
)
ORDER BY t.term_id;

-- Insert child categories (linking to imported parents)
INSERT INTO oaf.categories (
    name,
    parent_id,
    description,
    wp_term_id
)
SELECT 
    t.name,
    pc.id as parent_id,
    tt.description,
    t.term_id as wp_term_id
FROM wordpress_import.wp_terms t
JOIN wordpress_import.wp_term_taxonomy tt ON t.term_id = tt.term_id
LEFT JOIN oaf.categories pc ON pc.wp_term_id = tt.parent
WHERE tt.taxonomy = 'product_cat'
AND tt.parent > 0
AND NOT EXISTS (
    SELECT 1 FROM oaf.categories c WHERE c.wp_term_id = t.term_id
)
ORDER BY t.term_id;

-- Step 9c: Assign products to their WordPress categories
INSERT INTO oaf.product_categories (
    product_id,
    category_id
)
SELECT DISTINCT
    pr.id as product_id,
    oc.id as category_id
FROM oaf.products pr
JOIN wordpress_import.wp_posts wp ON pr.wp_id = wp.ID
JOIN wordpress_import.wp_term_relationships wtr ON wp.ID = wtr.object_id
JOIN wordpress_import.wp_term_taxonomy wtt ON wtr.term_taxonomy_id = wtt.term_taxonomy_id
JOIN oaf.categories oc ON oc.wp_term_id = wtt.term_id
WHERE pr.wp_id IS NOT NULL
AND wtt.taxonomy = 'product_cat'
AND NOT EXISTS (
    SELECT 1 FROM oaf.product_categories pc 
    WHERE pc.product_id = pr.id 
    AND pc.category_id = oc.id
);

-- Step 10: Insert vendor transactions
INSERT INTO oaf.vendor_transactions (
    vendor_id,
    order_id,
    transaction_type,
    amount,
    commission_rate,
    commission_amount,
    status,
    created_at
)
SELECT 
    u.id as vendor_id,
    o.id as order_id,
    CASE 
        WHEN vt.type = 'PAYMENT' THEN 'sale'
        WHEN vt.type = 'REFUND' THEN 'refund'
        ELSE 'sale'
    END as transaction_type,
    vt.amount,
    COALESCE(vs.commission_rate, 15.00) as commission_rate,
    vt.amount * COALESCE(vs.commission_rate, 15.00) / 100 as commission_amount,
    'completed' as status,
    vt.created_at
FROM wordpress_import.wp_vendor_transactions vt
JOIN oaf.users u ON vt.vendor_id = u.wp_id
LEFT JOIN oaf.orders o ON BINARY o.external_order_id = BINARY CONCAT('WP-', vt.order_id)
LEFT JOIN oaf.vendor_settings vs ON u.id = vs.vendor_id
WHERE u.wp_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM oaf.vendor_transactions vtr 
    WHERE vtr.vendor_id = u.id 
    AND vtr.order_id = o.id
    AND ABS(vtr.amount - vt.amount) < 0.01
    AND vtr.created_at = vt.created_at
);

-- Step 11: Create wp_artifacts records for tracking
INSERT INTO oaf.wp_artifacts (
    wp_id,
    user_id,
    table_name,
    notes,
    created_at
)
SELECT 
    u.wp_id,
    u.id as user_id,
    'wp_users' as table_name,
    CONCAT('User migration - ', u.user_type, ' account') as notes,
    NOW() as created_at
FROM oaf.users u
WHERE u.wp_id IS NOT NULL
AND u.id NOT IN (SELECT user_id FROM oaf.wp_artifacts WHERE table_name = 'wp_users');

COMMIT;

-- Verification
SELECT '=== USER MIGRATION COMPLETE ===' as status;

SELECT 'Step 1 - Users imported by type:' as info;
SELECT user_type, COUNT(*) as count 
FROM oaf.users 
WHERE wp_id IS NOT NULL
GROUP BY user_type;

SELECT 'Total WordPress users imported:' as info;
SELECT COUNT(*) as total FROM oaf.users WHERE wp_id IS NOT NULL;

SELECT 'Step 2 - User profiles created:' as info;
SELECT COUNT(*) as user_profiles_created
FROM oaf.user_profiles up
JOIN oaf.users u ON up.user_id = u.id
WHERE u.wp_id IS NOT NULL;

SELECT 'Step 3 - Artist profiles imported:' as info;
SELECT COUNT(*) as profiles_imported 
FROM oaf.artist_profiles ap
JOIN oaf.users u ON ap.user_id = u.id
WHERE u.wp_id IS NOT NULL;

SELECT 'Step 4 - Vendor settings imported:' as info;
SELECT 
    COUNT(*) as total_vendors,
    SUM(stripe_account_verified) as with_stripe_verified,
    SUM(CASE WHEN stripe_account_id != '' THEN 1 ELSE 0 END) as with_stripe_account
FROM oaf.vendor_settings vs
JOIN oaf.users u ON vs.vendor_id = u.id
WHERE u.wp_id IS NOT NULL;

SELECT 'Step 5 - Products imported:' as info;
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN pr.parent_id IS NULL THEN 1 END) as parent_products,
    COUNT(CASE WHEN pr.parent_id IS NOT NULL THEN 1 END) as child_products_variations
FROM oaf.products pr
JOIN oaf.users u ON pr.vendor_id = u.id
WHERE u.wp_id IS NOT NULL;

SELECT 'Products by status:' as info;
SELECT 
    pr.status, 
    COUNT(CASE WHEN pr.parent_id IS NULL THEN 1 END) as parent_count,
    COUNT(CASE WHEN pr.parent_id IS NOT NULL THEN 1 END) as variation_count
FROM oaf.products pr
JOIN oaf.users u ON pr.vendor_id = u.id
WHERE u.wp_id IS NOT NULL
GROUP BY pr.status;

SELECT 'Top vendors by product count:' as info;
SELECT 
    u.username, 
    ap.business_name,
    COUNT(pr.id) as product_count,
    CASE WHEN vs.stripe_account_verified = 1 THEN 'Yes' ELSE 'No' END as has_stripe
FROM oaf.users u
JOIN oaf.artist_profiles ap ON u.id = ap.user_id
LEFT JOIN oaf.vendor_settings vs ON u.id = vs.vendor_id
LEFT JOIN oaf.products pr ON u.id = pr.vendor_id AND u.wp_id IS NOT NULL
WHERE u.wp_id IS NOT NULL AND u.user_type = 'artist'
GROUP BY u.id, u.username, ap.business_name, vs.stripe_account_verified
ORDER BY product_count DESC
LIMIT 10;

SELECT 'Step 6 - Orders imported:' as info;
SELECT COUNT(*) as orders_imported
FROM oaf.orders o
WHERE o.external_order_id LIKE 'WP-%';

SELECT 'Orders by status:' as info;
SELECT o.status, COUNT(*) as count
FROM oaf.orders o
WHERE o.external_order_id LIKE 'WP-%'
GROUP BY o.status
ORDER BY count DESC;

SELECT 'Order revenue summary:' as info;
SELECT 
    COUNT(*) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    MIN(o.created_at) as first_order,
    MAX(o.created_at) as last_order
FROM oaf.orders o
WHERE o.external_order_id LIKE 'WP-%';

SELECT 'Step 7 - Events imported:' as info;
SELECT COUNT(*) as events_imported
FROM oaf.events e
WHERE e.seo_title LIKE 'WP-%';

SELECT 'Events by status:' as info;
SELECT e.event_status, COUNT(*) as count
FROM oaf.events e
WHERE e.seo_title LIKE 'WP-%'
GROUP BY e.event_status
ORDER BY count DESC;

SELECT 'Upcoming events:' as info;
SELECT 
    e.title,
    e.venue_city,
    e.venue_state,
    e.start_date,
    e.end_date
FROM oaf.events e
WHERE e.seo_title LIKE 'WP-%'
AND e.start_date >= CURDATE()
ORDER BY e.start_date
LIMIT 10;

SELECT 'Step 8 - Order items imported:' as info;
SELECT COUNT(*) as order_items_imported
FROM oaf.order_items oi
JOIN oaf.orders o ON oi.order_id = o.id
WHERE o.external_order_id LIKE 'WP-%';

SELECT 'Order items by vendor:' as info;
SELECT 
    u.username,
    ap.business_name,
    COUNT(oi.id) as items_sold,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price) as total_sales,
    SUM(oi.commission_amount) as total_commission
FROM oaf.order_items oi
JOIN oaf.users u ON oi.vendor_id = u.id
JOIN oaf.artist_profiles ap ON u.id = ap.user_id
JOIN oaf.orders o ON oi.order_id = o.id
WHERE o.external_order_id LIKE 'WP-%'
GROUP BY u.id, u.username, ap.business_name
ORDER BY total_sales DESC
LIMIT 10;

SELECT 'Step 9 - Categories imported:' as info;
SELECT 
    COUNT(*) as total_categories,
    SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) as parent_categories,
    SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) as child_categories
FROM oaf.categories
WHERE wp_term_id IS NOT NULL;

SELECT 'Top categories by product count:' as info;
SELECT 
    c.name,
    c.parent_id,
    COUNT(pc.product_id) as product_count
FROM oaf.categories c
LEFT JOIN oaf.product_categories pc ON c.id = pc.category_id
WHERE c.wp_term_id IS NOT NULL
GROUP BY c.id
ORDER BY product_count DESC
LIMIT 10;

SELECT 'Products categorized:' as info;
SELECT 
    COUNT(DISTINCT pr.id) as products_with_categories,
    COUNT(*) as total_category_assignments
FROM oaf.product_categories pc
JOIN oaf.products pr ON pc.product_id = pr.id
WHERE pr.wp_id IS NOT NULL;

SELECT 'Step 10 - Vendor transactions imported:' as info;
SELECT COUNT(*) as transactions_imported
FROM oaf.vendor_transactions vt
JOIN oaf.users u ON vt.vendor_id = u.id
WHERE u.wp_id IS NOT NULL;

SELECT 'Vendor payout summary:' as info;
SELECT 
    u.username,
    ap.business_name,
    COUNT(vt.id) as transaction_count,
    SUM(vt.amount) as total_payouts,
    SUM(vt.commission_amount) as total_commission
FROM oaf.vendor_transactions vt
JOIN oaf.users u ON vt.vendor_id = u.id
JOIN oaf.artist_profiles ap ON u.id = ap.user_id
WHERE u.wp_id IS NOT NULL
GROUP BY u.id, u.username, ap.business_name
ORDER BY total_payouts DESC
LIMIT 10;


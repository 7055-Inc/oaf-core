-- Migration Script: ALL Users & Stripe Connect Data
-- Source: wordpress_import database
-- Target: oaf database
-- Date: 2025-01-27
-- Purpose: Full user migration from WordPress to OAF

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
    u.user_login as username,
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
WHERE u.ID NOT IN (SELECT wp_id FROM oaf.users WHERE wp_id IS NOT NULL)
AND u.user_login != '';

-- Step 2: Insert artist profile data for all artists
INSERT INTO oaf.artist_profiles (
    user_id,
    business_name,
    studio_address_line1,
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
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.store_name')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_name')),
        'Unknown Business'
    ) as business_name,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.address.street_1')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_address')),
        ''
    ) as studio_address_line1,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.address.city')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_city')),
        ''
    ) as studio_city,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.address.state')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_state')),
        ''
    ) as studio_state,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.address.zip')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_zip')),
        ''
    ) as studio_zip,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.phone')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_phone')),
        ''
    ) as business_phone,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.social.gplus')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_website')),
        ''
    ) as business_website,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.social.fb')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_socials.facebook')),
        ''
    ) as business_social_facebook,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.social.instagram')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_socials.instagram')),
        ''
    ) as business_social_instagram,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.social.twitter')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_socials.twitter')),
        ''
    ) as business_social_twitter,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.social.pinterest')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_socials.pinterest')),
        ''
    ) as business_social_pinterest,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.vendor_biography')),
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_description')),
        ''
    ) as artist_biography,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_email')),
        wp_user.user_email,
        ''
    ) as customer_service_email,
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u
JOIN wordpress_import.wp_users wp_user ON u.wp_id = wp_user.ID
LEFT JOIN wordpress_import.wp_usermeta ps ON wp_user.ID = ps.user_id AND ps.meta_key = 'dokan_profile_settings'
WHERE u.user_type = 'artist'
AND u.id NOT IN (SELECT user_id FROM oaf.artist_profiles);

-- Step 3: Insert vendor settings with Stripe Connect data for all artists
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
    COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_commission')) AS DECIMAL(5,2)),
        15.00
    ) as commission_rate,
    COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(ps.meta_value, '$.business_due_days')) AS UNSIGNED),
        15
    ) as payout_days,
    COALESCE(
        sa.meta_value,
        ''
    ) as stripe_account_id,
    CASE WHEN sa.meta_value IS NOT NULL AND sa.meta_value != '' THEN 1 ELSE 0 END as stripe_account_verified,
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u
JOIN wordpress_import.wp_users wp_user ON u.wp_id = wp_user.ID
LEFT JOIN wordpress_import.wp_usermeta ps ON wp_user.ID = ps.user_id AND ps.meta_key = 'dokan_profile_settings'
LEFT JOIN wordpress_import.wp_usermeta sa ON wp_user.ID = sa.user_id AND sa.meta_key = '_stripe_account'
WHERE u.user_type = 'artist'
AND u.id NOT IN (SELECT vendor_id FROM oaf.vendor_settings);

-- Step 4: Create wp_artifacts records for tracking all migrations
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

-- Step 5: Migration summary and verification
SELECT 
    'Migration Summary' as report_type,
    COUNT(*) as total_users_migrated,
    SUM(CASE WHEN user_type = 'artist' THEN 1 ELSE 0 END) as artists,
    SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admins,
    SUM(CASE WHEN user_type = 'promoter' THEN 1 ELSE 0 END) as promoters,
    SUM(CASE WHEN user_type = 'community' THEN 1 ELSE 0 END) as community_users
FROM oaf.users 
WHERE wp_id IS NOT NULL;

SELECT 
    'Stripe Connect Summary' as report_type,
    COUNT(*) as total_vendors,
    SUM(stripe_account_verified) as verified_stripe_accounts,
    COUNT(CASE WHEN stripe_account_id != '' THEN 1 END) as stripe_accounts_found
FROM oaf.vendor_settings;

-- Step 6: Show any potential issues
SELECT 
    'Potential Issues' as issue_type,
    u.username,
    u.user_type,
    CASE 
        WHEN ap.user_id IS NULL AND u.user_type = 'artist' THEN 'Missing artist profile'
        WHEN vs.vendor_id IS NULL AND u.user_type = 'artist' THEN 'Missing vendor settings'
        ELSE 'OK'
    END as issue
FROM oaf.users u
LEFT JOIN oaf.artist_profiles ap ON u.id = ap.user_id
LEFT JOIN oaf.vendor_settings vs ON u.id = vs.vendor_id
WHERE u.wp_id IS NOT NULL
AND (
    (u.user_type = 'artist' AND ap.user_id IS NULL) OR
    (u.user_type = 'artist' AND vs.vendor_id IS NULL)
); 
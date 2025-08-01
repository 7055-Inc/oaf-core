-- Migration Script: Meyerdirk Art User & Stripe Connect Data
-- Source: wordpress_import database
-- Target: oaf database
-- Date: 2025-01-27

-- Step 1: Insert user record
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
    'meyerdirk-art' as username,
    '$P$B.2lN11MKTdo0Lt83stp2sMuQzVSo30' as password, -- Original WordPress password hash
    'yes' as email_verified,
    'artist' as user_type,
    'active' as status,
    13 as wp_id, -- Original WordPress user ID
    '2020-05-06 20:17:32' as created_at, -- Original registration date
    NOW() as updated_at
FROM wordpress_import.wp_users 
WHERE ID = 13;

-- Step 2: Insert artist profile data
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
    artist_biography,
    customer_service_email,
    created_at,
    updated_at
)
SELECT 
    u.id as user_id,
    'Meyerdirk Art' as business_name,
    '7055 Highway 9' as studio_address_line1,
    'Harris' as studio_city,
    'IA' as studio_state,
    '51345' as studio_zip,
    '712-461-0794' as business_phone,
    'http://meyerdirkart.com' as business_website,
    'https://www.facebook.com/Patricemeyerdirk' as business_social_facebook,
    'http://www.instagram.com/meyerdirkart' as business_social_instagram,
    'In the summer of 1995, Greg & Patrice decided to take Greg\'s hobby and love of metal working to a new level. He started creating new designs to take to local art festivals, calling his new company "The Test of Time" to symbolize the longevity of hand crafted metal art. In the beginning, the designs were pretty simple, and driven primarily by customer requests. Designs ranged from yard stakes and garden ornaments to heavy-duty indoor wall art. In the early days, traveling conditions for art festivals were cozy, to say the least. Greg & Patrice would travel to a show, set up the display booth, then escape into their modified cargo trailer for the night. Although they had a bed to sleep in, conditions weren\'t ideal. They didn\'t have any kind of running water, heat, or air conditioning, so the cargo trailer could get a little cramped on the weekends that were overly hot, unusually cold, or during the inevitable overnight rain storms. Many things changed and improved in the years that followed. That cargo trailer was soon replaced by a much more comfortable horse trailer with living quarters. Designs changed and evolved. Each season, they would introduce several new pieces – often adding to existing collections, and other times creating all new lines, unrelated to anything prior. Show schedules evolved and changed, and even clientele changed as the business continued to grow. Soon, it was time for a new business name to better reflect the evolved business. Since Greg & Patrice are both left-handed, and most of the designs were evolving into animal and wildlife related pieces, they eventually settled on a name-change to Southpaws. In 2009, Greg & Patrice (by now dba Meyerdirk Art)decided it was time to extend the art festival season again and decided to try out some winter art festivals in Arizona and New Mexico with some of the new contemporary designs they\'d been experimenting with. So, they loaded up the horse trailer and headed south. They spent most of October and November in the Southwest region. Having enjoyed it, they decideGreg and Patrice continue to do art festivals in the summer, based from Iowa, and in the winter, based from Arizona. Greg and Patrice continue to do art festivals in the summer, based from Iowa, and in the winter, based from Arizona.' as artist_biography,
    'patrice@meyerdirkart.com' as customer_service_email,
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u 
WHERE u.wp_id = 13;

-- Step 3: Insert vendor settings with Stripe Connect data
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
    15.00 as commission_rate, -- Default commission rate
    15 as payout_days, -- Default payout days
    'acct_1IbojXAcqXCgVstc' as stripe_account_id, -- Original Stripe account ID
    1 as stripe_account_verified, -- Mark as verified since they have an account
    NOW() as created_at,
    NOW() as updated_at
FROM oaf.users u 
WHERE u.wp_id = 13;

-- Step 4: Create wp_artifacts record for tracking
INSERT INTO oaf.wp_artifacts (
    wp_id,
    user_id,
    table_name,
    notes,
    created_at
)
SELECT 
    13 as wp_id,
    u.id as user_id,
    'wp_users' as table_name,
    'Meyerdirk Art user migration - includes profile and Stripe Connect data' as notes,
    NOW() as created_at
FROM oaf.users u 
WHERE u.wp_id = 13;

-- Verification queries
SELECT 'User created successfully' as status, u.id, u.username, u.user_type, u.status 
FROM oaf.users u WHERE u.wp_id = 13;

SELECT 'Artist profile created successfully' as status, ap.user_id, ap.business_name, ap.business_phone
FROM oaf.artist_profiles ap 
JOIN oaf.users u ON ap.user_id = u.id 
WHERE u.wp_id = 13;

SELECT 'Vendor settings created successfully' as status, vs.vendor_id, vs.stripe_account_id, vs.stripe_account_verified
FROM oaf.vendor_settings vs 
JOIN oaf.users u ON vs.vendor_id = u.id 
WHERE u.wp_id = 13; 
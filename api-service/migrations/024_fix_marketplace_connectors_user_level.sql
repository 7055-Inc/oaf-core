-- Migration 024: Fix Marketplace Connectors to User-Level
-- Walmart, Wayfair, and Etsy connectors should be user-level (not site-level)
-- They work WITH sites but don't REQUIRE sites (accessible via catalog)

UPDATE website_addons
SET 
    user_level = 1,
    category = 'marketplace',
    updated_at = NOW()
WHERE addon_slug IN ('walmart-connector', 'wayfair-connector', 'etsy-connector')
AND user_level = 0;

-- Verify the change
SELECT addon_slug, user_level, category 
FROM website_addons 
WHERE addon_slug IN ('walmart-connector', 'wayfair-connector', 'etsy-connector', 'tiktok-connector')
ORDER BY addon_slug;

-- Migration 016: Add Back-to-Top Button Addon
-- Date: 2026-02-08
-- Description: Adds the back-to-top button addon - a floating button for quick navigation to page top

-- Insert back-to-top addon
INSERT INTO website_addons (
  addon_name,
  addon_slug,
  description,
  addon_script_path,
  tier_required,
  is_active,
  monthly_price,
  display_order,
  user_level,
  category,
  created_at,
  updated_at
) VALUES (
  'Back-to-Top Button',
  'back-to-top',
  'Floating button that appears when scrolling, providing quick navigation back to the top of the page. Features smooth scroll animation, customizable positioning, and full accessibility support.',
  '/addons/back-to-top/script.js',
  'free',
  1,
  0.00,
  10,
  0,
  'site_features',
  NOW(),
  NOW()
);

-- Verify insertion
SELECT 
  id,
  addon_name,
  addon_slug,
  tier_required,
  monthly_price,
  is_active
FROM website_addons 
WHERE addon_slug = 'back-to-top';

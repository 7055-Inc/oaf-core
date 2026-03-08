-- Migration 019: Add Announcement Bar Addon
-- Date: 2026-02-08
-- Description: Adds announcement bar addon - top/bottom message strip with countdown timer

-- Insert announcement-bar addon
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
  'Announcement Bar',
  'announcement-bar',
  'Top or bottom message strip with optional countdown timer, dismissible functionality, and custom CTA button. Perfect for promotions, sales, and important announcements. Includes persistent localStorage dismiss and customizable colors.',
  '/addons/announcement-bar/script.js',
  'basic',
  1,
  9.99,
  40,
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
WHERE addon_slug = 'announcement-bar';

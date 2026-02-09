-- Migration 017: Add Menu Icons Addon
-- Date: 2026-02-08
-- Description: Adds menu icons addon - customizable icons for navigation menu items

-- Insert menu-icons addon
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
  'Menu Icons',
  'menu-icons',
  'Add customizable icons to navigation menu items. Supports emojis, Font Awesome, SVG, and image URLs. Configure via JSON or data attributes with flexible positioning and hover animations.',
  '/addons/menu-icons/script.js',
  'basic',
  1,
  9.99,
  20,
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
WHERE addon_slug = 'menu-icons';

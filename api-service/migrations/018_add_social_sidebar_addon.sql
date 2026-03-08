-- Migration 018: Add Social Media Sidebar Addon
-- Date: 2026-02-08
-- Description: Adds social media sidebar addon - displays social icons pulled from user profiles

-- Insert social-sidebar addon
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
  'Social Media Sidebar',
  'social-sidebar',
  'Display social media icons with links automatically pulled from your business or personal profiles. Supports Facebook, Instagram, TikTok, Twitter/X, Pinterest, and WhatsApp. Flexible positioning (sidebar, footer, or floating) with multiple icon styles.',
  '/addons/social-sidebar/script.js',
  'basic',
  1,
  9.99,
  30,
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
WHERE addon_slug = 'social-sidebar';

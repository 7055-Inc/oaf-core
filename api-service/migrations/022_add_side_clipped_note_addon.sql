-- Migration 022: Add Side Clipped Note Addon
-- Date: 2026-02-08
-- Description: Adds side clipped note addon - floating edge tabs with slide-in messages

-- Insert side-clipped-note addon
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
  'Side Clipped Note',
  'side-clipped-note',
  'Floating tab on page edge that slides in on hover to reveal messages or announcements. Includes custom colors, optional action buttons (link/scroll/modal), and per-site API-driven configuration.',
  '/addons/side-clipped-note/script.js',
  'professional',
  1,
  19.99,
  60,
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
WHERE addon_slug = 'side-clipped-note';

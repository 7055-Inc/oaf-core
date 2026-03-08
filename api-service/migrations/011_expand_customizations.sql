-- Migration 011: Expand Customizations System with Additional Style Options
-- Adds columns for button styles, spacing, layout styles, and Google Fonts tracking
-- Sprint 8: Expand Customization System with Google Fonts

-- Add new customization columns to site_customizations table
ALTER TABLE site_customizations
ADD COLUMN button_style ENUM('rounded', 'square', 'pill') DEFAULT 'rounded' COMMENT 'Button corner style' AFTER custom_css,
ADD COLUMN button_color VARCHAR(7) DEFAULT NULL COMMENT 'Button color override (hex format)' AFTER button_style,
ADD COLUMN border_radius VARCHAR(10) DEFAULT '4px' COMMENT 'Global border radius value' AFTER button_color,
ADD COLUMN spacing_scale ENUM('compact', 'normal', 'relaxed') DEFAULT 'normal' COMMENT 'Overall spacing scale multiplier' AFTER border_radius,
ADD COLUMN hero_style ENUM('gradient', 'solid', 'image', 'minimal') DEFAULT 'gradient' COMMENT 'Hero section visual style' AFTER spacing_scale,
ADD COLUMN navigation_style ENUM('horizontal', 'centered', 'minimal', 'sidebar') DEFAULT 'horizontal' COMMENT 'Navigation layout style' AFTER hero_style,
ADD COLUMN footer_text TEXT DEFAULT NULL COMMENT 'Custom footer text content' AFTER navigation_style,
ADD COLUMN google_fonts_loaded JSON DEFAULT NULL COMMENT 'Array of Google Font families currently loaded for this site' AFTER footer_text;

-- Add indexes for frequently queried style columns
ALTER TABLE site_customizations 
ADD INDEX idx_button_style (button_style),
ADD INDEX idx_hero_style (hero_style),
ADD INDEX idx_navigation_style (navigation_style);

-- Migration completed successfully

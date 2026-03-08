-- Migration 014: Add Template-Specific Data System
-- Creates site_template_data table for template-specific customization fields
-- Sprint 11A: Template-Specific Customization System
-- Date: 2026-02-07

-- Create site_template_data table
-- This table stores template-specific customization fields
-- One row per site, per template, per field
-- Data is preserved when users switch templates
CREATE TABLE IF NOT EXISTS site_template_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  site_id BIGINT NOT NULL COMMENT 'Reference to sites.id',
  template_id BIGINT NOT NULL COMMENT 'Reference to website_templates.id',
  field_key VARCHAR(100) NOT NULL COMMENT 'Field identifier from template schema.json (e.g., hero_video_url)',
  field_value TEXT COMMENT 'Field value - stored as text, type validation in application layer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints with CASCADE delete
  -- When a site is deleted, remove its template data
  CONSTRAINT fk_site_template_data_site 
    FOREIGN KEY (site_id) 
    REFERENCES sites(id) 
    ON DELETE CASCADE,
  
  -- When a template is deleted, remove associated data
  CONSTRAINT fk_site_template_data_template 
    FOREIGN KEY (template_id) 
    REFERENCES website_templates(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: one row per site + template + field combination
  -- Prevents duplicate field entries
  UNIQUE KEY unique_site_template_field (site_id, template_id, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Template-specific customization data - preserves data across template switches';

-- Add indexes for query performance
-- Index on site_id for "get all template data for this site"
CREATE INDEX idx_site_id ON site_template_data(site_id);

-- Index on template_id for "get all sites using this template with data"
CREATE INDEX idx_template_id ON site_template_data(template_id);

-- Composite index on (site_id, template_id) for fast lookups
-- Most common query: "get template data for site X using template Y"
CREATE INDEX idx_site_template ON site_template_data(site_id, template_id);

-- Index on field_key for analytics queries ("which sites use this field?")
CREATE INDEX idx_field_key ON site_template_data(field_key);

-- Migration completed successfully

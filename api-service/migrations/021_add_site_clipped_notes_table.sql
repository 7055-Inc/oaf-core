-- Migration 021: Add Site Clipped Notes Table
-- Date: 2026-02-08
-- Description: Creates table for side clipped note addon - floating edge tabs for sites

CREATE TABLE IF NOT EXISTS site_clipped_notes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  site_id BIGINT NOT NULL,
  title VARCHAR(100) DEFAULT 'Note',
  message TEXT NOT NULL,
  position ENUM('left', 'right') DEFAULT 'left',
  background_color VARCHAR(20) DEFAULT '#055474',
  text_color VARCHAR(20) DEFAULT '#ffffff',
  action_type ENUM('none', 'scroll', 'modal', 'link') DEFAULT 'none',
  action_value VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_id (site_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
DESCRIBE site_clipped_notes;

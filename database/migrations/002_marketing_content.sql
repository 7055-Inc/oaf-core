-- Migration: Marketing Content Submissions System
-- Date: 2026-02-02
-- Description: Creates tables for user-submitted marketing content
--              Allows users to submit images/videos for promotional use
--              Includes admin notes and consent tracking

-- ============================================================================
-- STEP 1: Create marketing_content_submissions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_content_submissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  business_name VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  description TEXT,
  consent_given TINYINT(1) NOT NULL DEFAULT 1,
  admin_notes TEXT DEFAULT NULL,
  status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: Create marketing_content_media table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_content_media (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  submission_id BIGINT NOT NULL,
  image_path VARCHAR(500) NOT NULL COMMENT 'Path in temp_images/marketing folder',
  original_filename VARCHAR(255),
  media_type VARCHAR(50) COMMENT 'image or video',
  mime_type VARCHAR(100),
  file_size BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_submission_id (submission_id),
  FOREIGN KEY (submission_id) REFERENCES marketing_content_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT 'marketing_content_submissions' as table_name, COUNT(*) as row_count FROM marketing_content_submissions;
SELECT 'marketing_content_media' as table_name, COUNT(*) as row_count FROM marketing_content_media;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TABLE IF EXISTS marketing_content_media;
-- DROP TABLE IF EXISTS marketing_content_submissions;

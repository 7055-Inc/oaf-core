-- Migration: 038_create_user_media_submissions
-- Creates a unified table for user-submitted media content.
-- Replaces the old marketing_content_submissions + marketing_content_media tables.
-- Serves as: admin media library, front-side user gallery, and form submission store.

CREATE TABLE IF NOT EXISTS user_media_submissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  pending_image_id BIGINT NULL,
  image_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  description TEXT,
  media_used TINYINT(1) DEFAULT 0,
  status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ums_user_id (user_id),
  INDEX idx_ums_status (status),
  INDEX idx_ums_pending_image_id (pending_image_id),
  INDEX idx_ums_media_used (media_used)
);

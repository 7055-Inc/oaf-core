-- Marketplace Jury Applications Database Table
-- Stores form submissions for marketplace jury review process

CREATE TABLE IF NOT EXISTS marketplace_applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  
  -- Application form data
  work_description TEXT NOT NULL,
  additional_info TEXT,
  
  -- User profile snapshot (JSON for reference)
  profile_data JSON,
  
  -- Media file references (links to pending_images table)
  raw_materials_media_id BIGINT NULL,
  work_process_1_media_id BIGINT NULL,
  work_process_2_media_id BIGINT NULL,
  work_process_3_media_id BIGINT NULL,
  artist_at_work_media_id BIGINT NULL,
  booth_display_media_id BIGINT NULL,
  artist_working_video_media_id BIGINT NULL,
  artist_bio_video_media_id BIGINT NULL,
  additional_video_media_id BIGINT NULL,
  
  -- Application status
  status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
  
  -- Admin review data
  reviewed_by BIGINT NULL,
  review_date TIMESTAMP NULL,
  admin_notes TEXT NULL,
  denial_reason TEXT NULL,
  
  -- Terms acceptance
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_date TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Media foreign keys (nullable - media may fail processing)
  FOREIGN KEY (raw_materials_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (work_process_1_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (work_process_2_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (work_process_3_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (artist_at_work_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (booth_display_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (artist_working_video_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (artist_bio_video_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  FOREIGN KEY (additional_video_media_id) REFERENCES pending_images(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_reviewed_by (reviewed_by)
);

-- NOTE: We will NOT modify the existing pending_images table structure
-- to avoid breaking the existing media processing system.
-- Instead, we'll work with the current structure and handle jury media
-- through the existing workflow without schema changes.

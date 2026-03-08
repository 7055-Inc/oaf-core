-- Migration: Create user_file_uploads table for Shared Library feature
-- Date: 2026-01-15
-- Description: Stores user-uploaded files with virus scanning status tracking

-- Create the main table
CREATE TABLE IF NOT EXISTS user_file_uploads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  filename VARCHAR(255) NOT NULL COMMENT 'Stored filename (uuid-based)',
  original_name VARCHAR(255) NOT NULL COMMENT 'User original filename',
  file_size BIGINT NOT NULL COMMENT 'File size in bytes',
  mime_type VARCHAR(100),
  note TEXT COMMENT 'Optional user note/description',
  status ENUM(
    'uploading',      -- File being uploaded
    'scanning',       -- Virus scan in progress
    'available',      -- Clean, ready to use
    'quarantined',    -- Failed virus scan
    'deleted'         -- Soft deleted by user
  ) DEFAULT 'uploading',
  scan_result VARCHAR(255) COMMENT 'Virus name if infected, clean if passed',
  scanned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  -- Foreign key to users table
  CONSTRAINT fk_file_uploads_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes for common queries
  INDEX idx_user_status (user_id, status, created_at),
  INDEX idx_scanning (status, created_at),
  INDEX idx_user_available (user_id, status) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add comments to table
ALTER TABLE user_file_uploads 
  COMMENT = 'Shared Library file uploads with virus scanning support';

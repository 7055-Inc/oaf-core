-- SOP Catalog: schema (run after 01_create_database.sql)
-- Usage: mysql -h 10.128.0.31 -P 3306 -u oafuser -p brakebee_sop < 02_schema.sql

USE brakebee_sop;

-- Enrolled users (local ID = primary; audit shows ID only, never email on front)
CREATE TABLE sop_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  brakebee_user_id BIGINT UNSIGNED NULL COMMENT 'Optional link to main app user',
  user_type ENUM('frontline', 'manage', 'top') NOT NULL DEFAULT 'frontline',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email),
  KEY idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Folders: outline nodes (title + parent only)
CREATE TABLE sop_folders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  parent_id INT UNSIGNED NULL COMMENT 'Folder or NULL for root',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED NULL,
  KEY idx_parent (parent_id),
  KEY idx_created_by (created_by),
  CONSTRAINT fk_folder_parent FOREIGN KEY (parent_id) REFERENCES sop_folders (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_folder_created_by FOREIGN KEY (created_by) REFERENCES sop_users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SOP documents
CREATE TABLE sop_sops (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  folder_id INT UNSIGNED NULL COMMENT 'Folder or NULL for root',
  title VARCHAR(500) NOT NULL,
  status ENUM('draft', 'proposed', 'active', 'deprecated', 'deleted') NOT NULL DEFAULT 'draft',
  owner_role VARCHAR(255) NULL COMMENT 'Free text, e.g. job title',
  change_notes TEXT NULL,
  purpose_expected_outcome TEXT NULL,
  when_to_use TEXT NULL,
  when_not_to_use TEXT NULL,
  standard_workflow JSON NULL COMMENT 'Block editor content',
  exit_points JSON NULL,
  escalation JSON NULL,
  transfer JSON NULL,
  related_sop_ids JSON NULL COMMENT 'Array of SOP ids',
  additional_information JSON NULL,
  submitted_by INT UNSIGNED NULL COMMENT 'Local user id who proposed',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  KEY idx_folder (folder_id),
  KEY idx_status (status),
  KEY idx_created_at (created_at),
  KEY idx_updated_at (updated_at),
  KEY idx_submitted_by (submitted_by),
  CONSTRAINT fk_sop_folder FOREIGN KEY (folder_id) REFERENCES sop_folders (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sop_submitted_by FOREIGN KEY (submitted_by) REFERENCES sop_users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sop_created_by FOREIGN KEY (created_by) REFERENCES sop_users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sop_updated_by FOREIGN KEY (updated_by) REFERENCES sop_users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Version history: every change with "changed from X to Y by [local user id]"
CREATE TABLE sop_versions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sop_id INT UNSIGNED NOT NULL,
  changed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by INT UNSIGNED NOT NULL,
  change_summary VARCHAR(500) NULL COMMENT 'e.g. Changed from: draft, to: proposed by 3',
  snapshot JSON NULL COMMENT 'Full SOP document at this version',
  KEY idx_sop (sop_id),
  KEY idx_changed_at (changed_at),
  CONSTRAINT fk_version_sop FOREIGN KEY (sop_id) REFERENCES sop_sops (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_version_changed_by FOREIGN KEY (changed_by) REFERENCES sop_users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- App-wide header/footer template (single row)
CREATE TABLE sop_layout (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  header_blocks JSON NULL,
  footer_blocks JSON NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NULL,
  CONSTRAINT fk_layout_updated_by FOREIGN KEY (updated_by) REFERENCES sop_users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sop_layout (id, header_blocks, footer_blocks) VALUES (1, NULL, NULL);

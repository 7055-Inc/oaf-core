-- Migration to remove authentication-related tables
-- This preserves the users table but removes other authentication components
-- for a clean slate to implement a new authentication system

-- Create backup tables only if they exist
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'email_verification_tokens');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE email_verification_tokens_backup LIKE email_verification_tokens; INSERT INTO email_verification_tokens_backup SELECT * FROM email_verification_tokens;', 'SELECT "email_verification_tokens does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_requirement_status');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE user_requirement_status_backup LIKE user_requirement_status; INSERT INTO user_requirement_status_backup SELECT * FROM user_requirement_status;', 'SELECT "user_requirement_status does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'login_checklist_requirements');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE login_checklist_requirements_backup LIKE login_checklist_requirements; INSERT INTO login_checklist_requirements_backup SELECT * FROM login_checklist_requirements;', 'SELECT "login_checklist_requirements does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'login_checklist_logs');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE login_checklist_logs_backup LIKE login_checklist_logs; INSERT INTO login_checklist_logs_backup SELECT * FROM login_checklist_logs;', 'SELECT "login_checklist_logs does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE password_reset_tokens_backup LIKE password_reset_tokens; INSERT INTO password_reset_tokens_backup SELECT * FROM password_reset_tokens;', 'SELECT "password_reset_tokens does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'permissions');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE permissions_backup LIKE permissions; INSERT INTO permissions_backup SELECT * FROM permissions;', 'SELECT "permissions does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'permissions_log');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE permissions_log_backup LIKE permissions_log; INSERT INTO permissions_log_backup SELECT * FROM permissions_log;', 'SELECT "permissions_log does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'terms_acceptances');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE terms_acceptances_backup LIKE terms_acceptances; INSERT INTO terms_acceptances_backup SELECT * FROM terms_acceptances;', 'SELECT "terms_acceptances does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'terms_versions');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE terms_versions_backup LIKE terms_versions; INSERT INTO terms_versions_backup SELECT * FROM terms_versions;', 'SELECT "terms_versions does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'saved_registrations');
SET @create_backup = IF(@table_exists > 0, 'CREATE TABLE saved_registrations_backup LIKE saved_registrations; INSERT INTO saved_registrations_backup SELECT * FROM saved_registrations;', 'SELECT "saved_registrations does not exist"');
PREPARE stmt FROM @create_backup;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop foreign key constraints before dropping tables if the tables exist
-- Check if email_verification_tokens exists and if its foreign key exists and drop it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'email_verification_tokens');
IF @table_exists > 0 THEN
  SET @email_fk_exists = (
      SELECT COUNT(*)
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
      AND table_name = 'email_verification_tokens'
      AND constraint_name = 'email_verification_tokens_ibfk_1'
  );

  IF @email_fk_exists > 0 THEN
    ALTER TABLE email_verification_tokens DROP FOREIGN KEY email_verification_tokens_ibfk_1;
  END IF;
END IF;

-- Check if user_requirement_status exists and if its foreign key exists and drop it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_requirement_status');
IF @table_exists > 0 THEN
  SET @user_req_fk_exists = (
      SELECT COUNT(*)
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
      AND table_name = 'user_requirement_status'
      AND referenced_table_name IS NOT NULL
  );

  IF @user_req_fk_exists > 0 THEN
    ALTER TABLE user_requirement_status DROP FOREIGN KEY user_requirement_status_ibfk_1;
  END IF;
END IF;

-- Check if permissions exists and if its foreign key exists and drop it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'permissions');
IF @table_exists > 0 THEN
  SET @permissions_fk_exists = (
      SELECT COUNT(*)
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
      AND table_name = 'permissions'
      AND referenced_table_name IS NOT NULL
  );

  IF @permissions_fk_exists > 0 THEN
    ALTER TABLE permissions DROP FOREIGN KEY permissions_ibfk_1;
  END IF;
END IF;

-- Check if permissions_log exists and if its foreign key to permissions exists and drop it
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'permissions_log');
IF @table_exists > 0 THEN
  SET @permissions_log_fk_exists = (
      SELECT COUNT(*)
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
      AND table_name = 'permissions_log'
      AND referenced_table_name = 'permissions'
  );

  IF @permissions_log_fk_exists > 0 THEN
    ALTER TABLE permissions_log DROP FOREIGN KEY permissions_log_ibfk_1;
  END IF;
END IF;

-- Now drop the tables in the correct order (to avoid foreign key constraints)
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS user_requirement_status;
DROP TABLE IF EXISTS login_checklist_requirements;
DROP TABLE IF EXISTS login_checklist_logs;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS permissions_log;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS terms_acceptances;
DROP TABLE IF EXISTS terms_versions;
DROP TABLE IF EXISTS saved_registrations;

-- Migration completed successfully! 
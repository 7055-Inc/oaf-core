-- Migration to remove Google dependency from authentication
-- This modifies the users table to support standard password-based authentication

-- Backup users table first
CREATE TABLE users_backup LIKE users;
INSERT INTO users_backup SELECT * FROM users;

-- 1. Make google_uid nullable to allow for non-Google users
ALTER TABLE users MODIFY COLUMN google_uid VARCHAR(128) NULL;

-- 2. Ensure there's a password column
-- Check if password column exists, if not add it
SET @password_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'password'
);

SET @add_password_column = IF(@password_column_exists = 0,
    'ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER username',
    'SELECT "Password column already exists"'
);

PREPARE stmt FROM @add_password_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add index to username for faster login lookups
-- Check if username index exists
SET @username_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'idx_username'
);

SET @create_username_idx = IF(@username_index_exists = 0,
    'CREATE INDEX idx_username ON users(username)',
    'SELECT "Username index already exists"'
);

PREPARE stmt FROM @create_username_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add unique constraint to username if it doesn't exist
-- Note: This may fail if there are duplicate usernames, and would need manual cleanup
SET @username_unique_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'unique_username'
    AND non_unique = 0
);

SET @create_username_unique = IF(@username_unique_exists = 0,
    'ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username)',
    'SELECT "Username unique constraint already exists"'
);

PREPARE stmt FROM @create_username_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Update foreign key in email_verification_tokens to reference users.id instead of users.google_uid
-- First check if the foreign key exists
SET @email_fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
    AND table_name = 'email_verification_tokens'
    AND constraint_name = 'email_verification_tokens_ibfk_1'
);

-- If the FK exists, drop it and recreate it pointing to users.id
SET @drop_email_fk = IF(@email_fk_exists > 0,
    'ALTER TABLE email_verification_tokens DROP FOREIGN KEY email_verification_tokens_ibfk_1',
    'SELECT "Foreign key does not exist"'
);

PREPARE stmt FROM @drop_email_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Before adding the new FK, alter the user_id column in email_verification_tokens
-- to match the data type of users.id
SET @alter_user_id_column = 'ALTER TABLE email_verification_tokens MODIFY COLUMN user_id BIGINT NOT NULL';

PREPARE stmt FROM @alter_user_id_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now create a new FK referencing users.id
SET @create_email_fk = 'ALTER TABLE email_verification_tokens ADD CONSTRAINT fk_email_verification_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE';

PREPARE stmt FROM @create_email_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration completed successfully! 
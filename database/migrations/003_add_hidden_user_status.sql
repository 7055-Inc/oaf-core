-- Migration: Add 'hidden' to user status enum
-- Date: 2026-02-03
-- Description: Adds 'hidden' status for users whose data should be filtered
--              from all public API responses system-wide.
--              Hidden users remain in database but are excluded from queries.

-- ============================================================================
-- STEP 1: Add 'hidden' to users.status enum
-- ============================================================================

ALTER TABLE users 
MODIFY COLUMN status ENUM('active','inactive','suspended','draft','deleted','hidden') 
DEFAULT 'draft';

-- ============================================================================
-- STEP 2: Verify the change
-- ============================================================================

-- Check new enum values
SHOW COLUMNS FROM users LIKE 'status';

-- Count users by status (should show no hidden users yet)
SELECT status, COUNT(*) as count 
FROM users 
GROUP BY status;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To remove 'hidden' from enum (only if no users have status='hidden'):
-- ALTER TABLE users 
-- MODIFY COLUMN status ENUM('active','inactive','suspended','draft','deleted') 
-- DEFAULT 'draft';

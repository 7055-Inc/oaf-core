-- Add delivery tracking support columns to order_item_tracking table
-- These columns support automated delivery status checking and email triggers

USE oaf;

ALTER TABLE order_item_tracking 
ADD COLUMN last_status VARCHAR(100) DEFAULT NULL COMMENT 'Last known delivery status from carrier API',
ADD COLUMN last_status_check TIMESTAMP NULL DEFAULT NULL COMMENT 'When the status was last checked with carrier API';

-- Add index for efficient delivery status checking queries
CREATE INDEX idx_delivery_status_check ON order_item_tracking (last_status, last_status_check);

-- Show the updated table structure
DESCRIBE order_item_tracking;
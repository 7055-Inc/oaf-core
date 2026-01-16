-- Support Ticket System Migration
-- Run this SQL to create the ticket system tables

-- Main tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(20) NOT NULL,
  
  -- Ticket Classification
  ticket_type ENUM('general', 'return', 'order', 'account', 'technical', 
                   'selling', 'events', 'feedback', 'other') NOT NULL DEFAULT 'general',
  
  -- Content
  subject VARCHAR(255) NOT NULL,
  
  -- People
  user_id BIGINT NULL,                        -- NULL if submitted by guest
  guest_email VARCHAR(255) NULL,              -- Email if guest submission
  guest_name VARCHAR(255) NULL,               -- Name if guest submission
  assigned_to BIGINT NULL,                    -- Admin/support agent
  
  -- Status & Priority
  status ENUM('open', 'awaiting_customer', 'awaiting_support', 
              'escalated', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  
  -- Related Entity (for linking to orders, returns, etc.)
  related_type ENUM('order', 'return', 'product', 'event', 'subscription', 'user') NULL,
  related_id BIGINT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  first_response_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  
  PRIMARY KEY (id),
  UNIQUE KEY idx_ticket_number (ticket_number),
  INDEX idx_user_tickets (user_id, status, created_at),
  INDEX idx_guest_email (guest_email),
  INDEX idx_assigned (assigned_to, status, priority),
  INDEX idx_status_priority (status, priority, created_at),
  INDEX idx_related (related_type, related_id),
  INDEX idx_ticket_type (ticket_type, status),
  
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
  COMMENT='Support ticket system - main tickets table';

-- Ticket messages (threaded conversation)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  
  -- Sender
  user_id BIGINT NULL,                        -- NULL if system message or guest
  sender_type ENUM('customer', 'guest', 'support', 'admin', 'system') NOT NULL,
  sender_name VARCHAR(255) NULL,              -- Display name for guest/system messages
  
  -- Content
  message_text TEXT NOT NULL,
  is_internal TINYINT(1) NOT NULL DEFAULT 0,  -- Internal notes (hidden from customer)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_ticket_messages (ticket_id, created_at),
  INDEX idx_user_messages (user_id, created_at),
  INDEX idx_internal (ticket_id, is_internal),
  
  CONSTRAINT fk_messages_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Support ticket messages - threaded conversation';

-- Ticket attachments (for future use)
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  message_id BIGINT NULL,
  
  -- File Info
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NULL,
  file_size INT NULL,
  
  -- Metadata
  uploaded_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_ticket_attachments (ticket_id),
  INDEX idx_message_attachments (message_id),
  
  CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachments_message FOREIGN KEY (message_id) REFERENCES support_ticket_messages(id) ON DELETE SET NULL,
  CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Support ticket file attachments';

-- Ticket status change log (audit trail)
CREATE TABLE IF NOT EXISTS support_ticket_status_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  
  field_changed VARCHAR(50) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  
  changed_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_ticket_log (ticket_id, created_at),
  INDEX idx_changed_by (changed_by, created_at),
  
  CONSTRAINT fk_log_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_log_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Support ticket status change audit log';


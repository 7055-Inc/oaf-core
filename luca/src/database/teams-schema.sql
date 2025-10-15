-- Team Management Schema for Luca Platform
-- Enables data sharing between users while maintaining security and ownership

-- Teams Table - Core team definitions
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_user_id INT NOT NULL, -- The original user who owns the data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_owner (owner_user_id),
    INDEX idx_name (name),
    
    -- Ensure reasonable team name lengths
    CONSTRAINT chk_team_name_length CHECK (CHAR_LENGTH(name) >= 2)
);

-- Team Members - Who has access to which teams
CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL, -- User ID from main app (matches JWT userId)
    role ENUM('owner', 'admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    permissions JSON, -- Granular permissions: {"materials": "edit", "products": "view", "collections": "edit"}
    invited_by INT NOT NULL, -- User who sent the invitation
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP NULL, -- Track team usage
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign keys
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_team_members (team_id),
    INDEX idx_user_teams (user_id),
    INDEX idx_active_members (team_id, is_active),
    
    -- Ensure unique membership per team
    UNIQUE KEY unique_team_user (team_id, user_id)
);

-- Team Invitations - Pending invitations to join teams
CREATE TABLE IF NOT EXISTS team_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
    permissions JSON, -- Default permissions for this invitation
    token VARCHAR(255) NOT NULL, -- Secure invitation token
    invited_by INT NOT NULL, -- User who sent the invitation
    expires_at TIMESTAMP NOT NULL, -- Invitation expiry (7 days default)
    accepted_at TIMESTAMP NULL, -- When invitation was accepted
    declined_at TIMESTAMP NULL, -- When invitation was declined
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_team_invitations (team_id),
    INDEX idx_email_invitations (email),
    INDEX idx_token (token),
    INDEX idx_pending (team_id, accepted_at, declined_at, expires_at),
    
    -- Ensure unique pending invitations
    UNIQUE KEY unique_pending_invitation (team_id, email, accepted_at, declined_at)
);

-- Team Activity Log - Track team actions for audit
CREATE TABLE IF NOT EXISTS team_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL, -- Who performed the action
    action_type ENUM('invite_sent', 'member_joined', 'member_removed', 'role_changed', 'permissions_updated', 'team_created', 'team_deleted') NOT NULL,
    target_user_id INT NULL, -- User affected by the action (for member actions)
    details JSON, -- Additional action details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_team_activity (team_id, created_at),
    INDEX idx_user_activity (user_id, created_at),
    INDEX idx_action_type (action_type, created_at)
);

-- Insert owner as team member when team is created (handled by application)
-- Trigger to automatically add team owner as admin member
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_team_insert 
AFTER INSERT ON teams
FOR EACH ROW
BEGIN
    INSERT INTO team_members (team_id, user_id, role, invited_by, permissions)
    VALUES (NEW.id, NEW.owner_user_id, 'owner', NEW.owner_user_id, '{"materials": "edit", "products": "edit", "collections": "edit", "shipping": "edit", "reports": "view"}');
    
    INSERT INTO team_activity_log (team_id, user_id, action_type, details)
    VALUES (NEW.id, NEW.owner_user_id, 'team_created', JSON_OBJECT('team_name', NEW.name));
END//
DELIMITER ;

-- Default permission templates for different roles
-- These will be used by the application when creating invitations
/*
Role Permission Templates:
- owner: {"materials": "edit", "products": "edit", "collections": "edit", "shipping": "edit", "reports": "view"}
- admin: {"materials": "edit", "products": "edit", "collections": "edit", "shipping": "edit", "reports": "view"}
- editor: {"materials": "edit", "products": "edit", "collections": "view", "shipping": "view", "reports": "view"}
- viewer: {"materials": "view", "products": "view", "collections": "view", "shipping": "view", "reports": "view"}
*/

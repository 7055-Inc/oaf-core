-- ============================================================================
-- Sprint C3: Ads & Email Marketing System
-- ============================================================================
-- This migration adds support for:
-- - Google Ads campaign management
-- - Bing/Microsoft Ads campaign management
-- - Email marketing campaigns and templates
-- - Subscriber management and tracking
--
-- Author: Leo Marketing System
-- Date: 2026-02-07
-- ============================================================================

USE wordpress_import;

-- ============================================================================
-- EMAIL MARKETING CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    marketing_campaign_id BIGINT,  -- Links to marketing_campaigns table
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template_id BIGINT,  -- Links to email_templates
    html_content LONGTEXT,
    text_content TEXT,
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    reply_to VARCHAR(255),
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'paused') DEFAULT 'draft',
    scheduled_at DATETIME,
    sent_at DATETIME,
    total_recipients INT DEFAULT 0,
    total_sent INT DEFAULT 0,
    total_opened INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    total_unsubscribed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_marketing_campaign (marketing_campaign_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_template (template_id),
    
    FOREIGN KEY (marketing_campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MARKETING EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_email_templates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),  -- 'promotional', 'newsletter', 'announcement', etc.
    html_content LONGTEXT NOT NULL,
    text_content TEXT,
    variables JSON,  -- Available merge fields/variables
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AD CAMPAIGNS (External Platform Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_campaigns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    marketing_campaign_id BIGINT,  -- Links to marketing_campaigns
    platform ENUM('google', 'bing') NOT NULL,
    external_campaign_id VARCHAR(255),  -- ID from ad platform (Google/Bing)
    name VARCHAR(255) NOT NULL,
    status ENUM('draft', 'pending', 'active', 'paused', 'ended') DEFAULT 'draft',
    campaign_type VARCHAR(100),  -- 'SEARCH', 'DISPLAY', 'VIDEO', 'SHOPPING', etc.
    budget_cents INT DEFAULT 0,  -- Total budget in cents
    daily_budget_cents INT DEFAULT 0,  -- Daily budget in cents
    bid_strategy VARCHAR(100),  -- 'MANUAL_CPC', 'TARGET_CPA', 'MAXIMIZE_CLICKS', etc.
    targeting JSON,  -- Audience targeting configuration
    settings JSON,  -- Platform-specific settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_marketing_campaign (marketing_campaign_id),
    INDEX idx_platform (platform),
    INDEX idx_status (status),
    INDEX idx_external_id (external_campaign_id),
    
    FOREIGN KEY (marketing_campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AD GROUPS (Optional - for detailed ad management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_groups (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ad_campaign_id BIGINT NOT NULL,
    external_ad_group_id VARCHAR(255),  -- ID from ad platform
    name VARCHAR(255) NOT NULL,
    status ENUM('draft', 'active', 'paused', 'removed') DEFAULT 'draft',
    bid_cents INT DEFAULT 0,  -- Default bid for ad group
    targeting JSON,  -- Keywords, audiences, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ad_campaign (ad_campaign_id),
    INDEX idx_external_id (external_ad_group_id),
    INDEX idx_status (status),
    
    FOREIGN KEY (ad_campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ADS (Individual ad creatives)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ads (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ad_group_id BIGINT NOT NULL,
    external_ad_id VARCHAR(255),  -- ID from ad platform
    ad_type VARCHAR(50),  -- 'EXPANDED_TEXT', 'RESPONSIVE_SEARCH', 'DISPLAY', etc.
    status ENUM('draft', 'active', 'paused', 'removed') DEFAULT 'draft',
    headlines JSON,  -- Array of headlines
    descriptions JSON,  -- Array of descriptions
    images JSON,  -- Array of image URLs
    final_url VARCHAR(500),  -- Landing page URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ad_group (ad_group_id),
    INDEX idx_external_id (external_ad_id),
    INDEX idx_status (status),
    
    FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EMAIL TRACKING (Opens, Clicks, Unsubscribes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_tracking (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email_campaign_id BIGINT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    user_id BIGINT,  -- NULL if external email
    event_type ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed') NOT NULL,
    event_data JSON,  -- Additional event data (link clicked, bounce reason, etc.)
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_campaign (email_campaign_id),
    INDEX idx_recipient (recipient_email),
    INDEX idx_user (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at),
    
    FOREIGN KEY (email_campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SUBSCRIBER LISTS (Optional - for segmented marketing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_subscriber_lists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SUBSCRIBER LIST MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_list_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    list_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_id BIGINT,  -- NULL if external email
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status ENUM('subscribed', 'unsubscribed', 'bounced') DEFAULT 'subscribed',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_list_email (list_id, email),
    INDEX idx_list (list_id),
    INDEX idx_email (email),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    
    FOREIGN KEY (list_id) REFERENCES email_subscriber_lists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Update social_connections table to support ad platforms
-- ============================================================================

ALTER TABLE social_connections 
MODIFY COLUMN platform ENUM(
    'instagram', 
    'facebook', 
    'tiktok', 
    'twitter', 
    'pinterest', 
    'google',  -- For Google Ads
    'bing'     -- For Bing/Microsoft Ads
) NOT NULL;

-- ============================================================================
-- Insert default email templates
-- ============================================================================

INSERT INTO marketing_email_templates (name, category, html_content, text_content, variables) VALUES
(
    'Newsletter Template',
    'newsletter',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{subject}}</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #055474; color: white; padding: 20px; text-align: center;"><h1>{{company_name}}</h1></div><div style="padding: 30px; background: #ffffff;"><h2>{{headline}}</h2>{{content}}</div><div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>{{company_name}}</p><p><a href="{{unsubscribe_link}}" style="color: #055474;">Unsubscribe</a></p></div></body></html>',
    '{{headline}}\n\n{{content}}\n\n---\n{{company_name}}\nUnsubscribe: {{unsubscribe_link}}',
    '{"subject": "Newsletter subject", "headline": "Newsletter headline", "content": "Newsletter content", "company_name": "Company name", "unsubscribe_link": "Unsubscribe URL"}'
),
(
    'Promotional Template',
    'promotional',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{subject}}</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #055474, #0a7ba5); color: white; padding: 40px; text-align: center;"><h1 style="margin: 0; font-size: 32px;">{{offer_title}}</h1><p style="font-size: 18px; margin: 10px 0;">{{offer_subtitle}}</p></div><div style="padding: 30px; background: #ffffff;"><p style="font-size: 16px; line-height: 1.6;">{{message}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{cta_url}}" style="background: #055474; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 18px;">{{cta_text}}</a></div></div><div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>{{company_name}}</p><p><a href="{{unsubscribe_link}}" style="color: #055474;">Unsubscribe</a></p></div></body></html>',
    '{{offer_title}}\n{{offer_subtitle}}\n\n{{message}}\n\n{{cta_text}}: {{cta_url}}\n\n---\n{{company_name}}\nUnsubscribe: {{unsubscribe_link}}',
    '{"subject": "Special offer", "offer_title": "Offer title", "offer_subtitle": "Offer subtitle", "message": "Promotional message", "cta_text": "Shop Now", "cta_url": "Link URL", "company_name": "Company name", "unsubscribe_link": "Unsubscribe URL"}'
);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Add comments for documentation
ALTER TABLE email_campaigns COMMENT = 'Marketing email campaigns with tracking';
ALTER TABLE marketing_email_templates COMMENT = 'Reusable marketing email templates with variable support';
ALTER TABLE ad_campaigns COMMENT = 'Google Ads and Bing Ads campaign tracking';
ALTER TABLE ad_groups COMMENT = 'Ad groups within ad campaigns';
ALTER TABLE ads COMMENT = 'Individual ad creatives';
ALTER TABLE email_tracking COMMENT = 'Email event tracking (opens, clicks, etc.)';
ALTER TABLE email_subscriber_lists COMMENT = 'Subscriber list management';
ALTER TABLE email_list_members COMMENT = 'Members of subscriber lists';

-- Success message
SELECT 'Sprint C3 migration completed successfully!' AS status;
SELECT 'Created 8 new tables for ads and email marketing' AS result;
SELECT 'Updated social_connections to support Google and Bing' AS result;
SELECT 'Inserted 2 default email templates' AS result;

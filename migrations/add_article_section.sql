-- Add section field to articles table
-- This allows categorizing articles within their page_type
-- e.g., help_article sections: getting-started, orders-shipping, account-profile, etc.
-- e.g., article sections: featured, news, interviews, reviews, guides, etc.

ALTER TABLE articles 
ADD COLUMN section VARCHAR(50) NULL AFTER page_type;

-- Add index for filtering by page_type and section together
CREATE INDEX idx_articles_section ON articles(page_type, section);


-- Add subject_line to drip_campaigns for single blasts (user-entered subject)
ALTER TABLE drip_campaigns
ADD COLUMN subject_line VARCHAR(500) NULL AFTER template_key;

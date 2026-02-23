-- Insert CRM email templates into email_templates
-- Content loaded from config/email-templates/crm-*.js when subject/body are NULL

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('simple-announcement', 'Simple Announcement', NULL, NULL, 0, 3, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('product-showcase', 'Product Showcase', NULL, NULL, 0, 3, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('event-invitation', 'Event Invitation', NULL, NULL, 0, 3, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('monthly-newsletter', 'Monthly Newsletter', NULL, NULL, 0, 3, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('special-offer', 'Special Offer', NULL, NULL, 0, 3, 'default', 0);

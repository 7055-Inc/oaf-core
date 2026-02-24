module.exports = {
  template_key: 'series_renewal_reminder',
  name: 'Series Renewal Reminder',
  subject_template: 'Time to renew: #{series_name} is coming up!',
  body_template: '<div style="font-family: Arial, sans-serif; max-width: 600px;">\n<h2 style="color: #055474;">🔄 Renewal Time: #{series_name}</h2>\n<p>Dear #{user_name},</p>\n<p>#{series_description}</p>\n<div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745;">\n<h4 style="margin: 0 0 10px 0; color: #28a745;">📅 What\'s Next:</h4>\n<ul>\n<li>Review your previous participation</li>\n<li>Update your artist profile if needed</li>\n<li>Prepare for the next event application</li>\n</ul>\n</div>\n<p>Best regards,<br>The Brakebee Team</p>\n</div>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

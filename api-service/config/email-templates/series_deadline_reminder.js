module.exports = {
  template_key: 'series_deadline_reminder',
  name: 'Application Deadline Approaching',
  subject_template: 'Only #{days_offset} days left to apply for #{series_name}!',
  body_template: '<div style="font-family: Arial, sans-serif; max-width: 600px;">\n<h2 style="color: #dc3545;">⏰ Deadline Alert: #{series_name}</h2>\n<p>Dear #{user_name},</p>\n<div style="background: #fff3cd; padding: 20px; margin: 20px 0; border: 1px solid #ffc107; border-radius: 5px;">\n<p style="margin: 0;">Complete your application before the deadline to secure your spot in this amazing event.</p>\n</div>\n<p>Login to your dashboard to complete your application now.</p>\n<p>Best regards,<br>The Brakebee Team</p>\n</div>',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

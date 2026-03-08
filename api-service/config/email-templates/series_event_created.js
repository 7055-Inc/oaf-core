module.exports = {
  template_key: 'series_event_created',
  name: 'New Series Event Created',
  subject_template: 'New event in #{series_name} series is now available!',
  body_template: '<div style="font-family: Arial, sans-serif; max-width: 600px;">\n<h2 style="color: #055474;">🎉 New Event Created: #{series_name}</h2>\n<p>Dear #{user_name},</p>\n<p>Great news! A new event has been created in the <strong>#{series_name}</strong> series.</p>\n<p>#{series_description}</p>\n<div style="background: #e8f5f3; padding: 20px; margin: 20px 0; border-left: 4px solid #055474;">\n<h4 style="margin: 0 0 10px 0; color: #055474;">🚀 Ready to Apply?</h4>\n</div>\n<p>Keep an eye out for the application opening announcement.</p>\n<p>Best regards,<br>The Brakebee Team</p>\n</div>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

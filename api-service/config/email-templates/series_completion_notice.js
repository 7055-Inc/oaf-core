module.exports = {
  template_key: 'series_completion_notice',
  name: 'Series Completion Notice',
  subject_template: 'Thank you for participating in #{series_name}!',
  body_template: '<div style="font-family: Arial, sans-serif; max-width: 600px;">\n<h2 style="color: #28a745;">🎊 Series Complete: #{series_name}</h2>\n<p>Dear #{user_name},</p>\n<p>#{series_description}</p>\n<div style="background: #d4edda; padding: 20px; margin: 20px 0; border: 1px solid #c3e6cb; border-radius: 5px;">\n</div>\n<p>Stay tuned for future opportunities and new series announcements.</p>\n<p>Best regards,<br>The Brakebee Team</p>\n</div>',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default'
};

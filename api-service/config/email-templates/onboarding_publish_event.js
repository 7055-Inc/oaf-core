module.exports = {
  template_key: 'onboarding_publish_event',
  name: 'Promoter Onboarding: Publish Your Event',
  subject_template: 'Ready to Publish Your Event?',
  body_template: '<h1>Ready to Go Live? 🚀</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Your event is looking good! When you\'re ready to start accepting applications, publish your event to make it visible to thousands of artists on Brakebee.</p>\n' +
    '<h2>Before You Publish</h2>\n' +
    '<p>Make sure you\'ve:</p>\n' +
    '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;"><p style="margin: 8px 0;">✓ Set your application deadline</p><p style="margin: 8px 0;">✓ Defined booth fees and categories</p><p style="margin: 8px 0;">✓ Added at least one event photo</p><p style="margin: 8px 0;">✓ Reviewed your event description</p></div>\n' +
    '<p>Once published, artists can immediately start applying to your event!</p>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{event_edit_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Publish Event</a></div>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

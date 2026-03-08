module.exports = {
  template_key: 'onboarding_accept_applications',
  name: 'Promoter Onboarding: Start Accepting Applications',
  subject_template: 'Start Accepting Artist Applications',
  body_template: '<h1>Open the Doors to Artists! 🎨</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Ready to start building your artist roster? Let\'s open applications!</p>\n' +
    '<h2>Application Settings</h2>\n' +
    '<p>Control every aspect of your application process:</p>\n' +
    '<ul><li><strong>Application Deadline:</strong> Set a clear cutoff date</li><li><strong>Jury Settings:</strong> Configure how you\'ll review applications</li><li><strong>Auto-Responses:</strong> Automatic confirmation emails to applicants</li><li><strong>Application Fee:</strong> Optional fee to cover processing</li><li><strong>Requirements:</strong> Specify what artists must submit</li></ul>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{event_settings_url}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Configure Applications</a></div>\n' +
    '<p><strong>Pro Tip:</strong> Set your deadline 2-3 months before your event to give artists time to prepare.</p>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

module.exports = {
  template_key: 'onboarding_welcome',
  name: 'Promoter Onboarding: Welcome',
  subject_template: 'Welcome to Brakebee! Let\'s Complete Your Event',
  body_template: '<h1>Welcome to Brakebee, #{promoter_name}! 🎉</h1>\n' +
    '<p>Congratulations on claiming your event! We\'re thrilled to have you on board.</p>\n' +
    '<p>You\'ve taken the first step in creating an amazing event experience for artists and attendees. Now let\'s make your event shine!</p>\n' +
    '<h2>Quick Start Checklist</h2>\n' +
    '<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 10px 0;">☐ Complete your event profile</p><p style="margin: 10px 0;">☐ Add event photos</p><p style="margin: 10px 0;">☐ Set up ticket tiers</p><p style="margin: 10px 0;">☐ Start accepting artist applications</p><p style="margin: 10px 0;">☐ Publish your event</p></div>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{event_edit_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Complete Your Event Profile</a></div>\n' +
    '<p>Need help? Check out our <a href="#{help_url}">Event Organizer Guide</a> or reply to this email.</p>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

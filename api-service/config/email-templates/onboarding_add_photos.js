module.exports = {
  template_key: 'onboarding_add_photos',
  name: 'Promoter Onboarding: Add Event Photos',
  subject_template: 'Make Your Event Stand Out With Photos',
  body_template: '<h1>A Picture is Worth 1,000 Applications 📸</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Events with great photos receive significantly more applications. Let\'s make your event visually compelling!</p>\n' +
    '<h2>Photo Tips</h2>\n' +
    '<ul><li><strong>Past Event Photos:</strong> Show artists the atmosphere and crowd</li><li><strong>Venue Shots:</strong> Help artists visualize their booth space</li><li><strong>Artist Action Shots:</strong> Artists selling, creating, engaging</li><li><strong>Attendee Experience:</strong> Happy crowds enjoying the event</li></ul>\n' +
    '<div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;"><p style="margin: 0;"><strong>Recommended:</strong> Upload 5-10 high-quality photos showcasing different aspects of your event.</p></div>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{photos_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Upload Photos</a></div>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

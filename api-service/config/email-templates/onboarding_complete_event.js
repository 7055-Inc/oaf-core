module.exports = {
  template_key: 'onboarding_complete_event',
  name: 'Promoter Onboarding: Complete Event Profile',
  subject_template: 'Complete Your Event Profile to Attract More Artists',
  body_template: '<h1>Let\'s Complete Your Event Profile</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>A complete event profile attracts more artists and attendees. Here\'s what makes a great event page:</p>\n' +
    '<h2>Essential Elements</h2>\n' +
    '<ul><li><strong>Detailed Description:</strong> Tell artists what makes your event special</li><li><strong>Clear Schedule:</strong> Application deadlines, jury dates, event dates</li><li><strong>Booth Information:</strong> Sizes, fees, and amenities</li><li><strong>Application Requirements:</strong> What artists need to submit</li><li><strong>Contact Information:</strong> Make it easy for artists to reach you</li></ul>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{event_edit_url}" style="background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Complete Event Profile</a></div>\n' +
    '<p><strong>Pro Tip:</strong> Events with complete profiles receive 3x more applications!</p>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

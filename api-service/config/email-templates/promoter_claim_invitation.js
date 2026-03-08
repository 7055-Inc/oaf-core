module.exports = {
  template_key: 'promoter_claim_invitation',
  name: 'Promoter Event Claim Invitation',
  subject_template: "You've Been Added to Brakebee! Claim Your Event: #{event_title}",
  body_template: '<h1>Welcome to Brakebee, #{promoter_first_name}!</h1>\n' +
    '<p>Great news! You\'ve been added to Brakebee, the premier platform for managing art fairs and events.</p>\n' +
    '<h2>Your Event Has Been Created</h2>\n' +
    '<p>We\'ve pre-created an event for you:</p>\n' +
    '<div style="background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0;">\n' +
    '  <h3 style="margin-top: 0;">#{event_title}</h3>\n' +
    '  <p style="margin: 8px 0;"><strong>Dates:</strong> #{event_start_date} - #{event_end_date}</p>\n' +
    '  <p style="margin: 8px 0;"><strong>Venue:</strong> #{venue_name}</p>\n' +
    '  <p style="margin: 8px 0;"><strong>Location:</strong> #{venue_city}, #{venue_state}</p>\n' +
    '</div>\n' +
    '<h2>What\'s Next?</h2>\n' +
    '<p>To activate your account and claim your event, simply click the button below. You\'ll be able to:</p>\n' +
    '<ul>\n' +
    '  <li>&#10004; Set your password and secure your account</li>\n' +
    '  <li>&#10004; Complete your event details</li>\n' +
    '  <li>&#10004; Start accepting artist applications</li>\n' +
    '  <li>&#10004; Manage ticket sales and booth assignments</li>\n' +
    '  <li>&#10004; Access powerful event management tools</li>\n' +
    '</ul>\n' +
    '<div style="text-align: center; margin: 30px 0;">\n' +
    '  <a href="#{claim_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Claim Your Event &amp; Activate Account</a>\n' +
    '</div>\n' +
    '<p style="color: #666; font-size: 14px;">This link will expire in #{expires_days} days. If you have any questions, please reply to this email.</p>\n' +
    '<p>We\'re excited to have you on board!</p>\n' +
    '<p><strong>The Brakebee Team</strong><br><a href="https://brakebee.com">brakebee.com</a></p>',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

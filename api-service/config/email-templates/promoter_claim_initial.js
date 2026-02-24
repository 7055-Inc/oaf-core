module.exports = {
  template_key: 'promoter_claim_initial',
  name: 'Promoter - Initial Claim Request',
  subject_template: 'Complete your listing for {{event_name}}',
  body_template: '<p>Hi {{promoter_first_name|default:\"Event Organizer\"}},</p>\n' +
    '<p>Your event <strong>{{event_name}}</strong> was added to Brakebee based on a user suggestion, but we\'re missing some critical information that artists need:</p>\n' +
    '<div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #ff6b6b;">\n' +
    '  <strong>Current listing:</strong><br>\n' +
    '  &bull; Dates: {{event_dates}}<br>\n' +
    '  &bull; Location: {{event_location}}<br>\n' +
    '  &bull; <strong>Booth fees:</strong> Not available &#9888;&#65039;<br>\n' +
    '  &bull; <strong>Application deadline:</strong> Missing<br>\n' +
    '  &bull; <strong>Application requirements:</strong> Missing\n' +
    '</div>\n' +
    '<p><strong>Why we need your help:</strong><br>\n' +
    'We only display booth fees from verified event organizers to ensure artists have 100% accurate pricing for business decisions. Currently, artists viewing your event can\'t see this essential information.</p>\n' +
    '<div style="text-align: center; margin: 30px 0;">\n' +
    '  <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event (2 minutes)</a>\n' +
    '</div>\n' +
    '<p><strong>Once you claim your event, you\'ll be able to:</strong></p>\n' +
    '<ul>\n' +
    '  <li>Add booth fees and application details</li>\n' +
    '  <li>See which artists are tracking your event</li>\n' +
    '  <li>Accept applications through our platform (optional)</li>\n' +
    '  <li>Earn affiliate commission on artist sales (optional)</li>\n' +
    '</ul>\n' +
    '<p>Artists are using Brakebee to discover festivals and track application deadlines. Help them find accurate information about {{event_name}}.</p>\n' +
    '<p style="margin-top: 30px;"><a href="{{claim_url}}">Claim your event here</a></p>\n' +
    '<p style="font-size: 12px; color: #666; margin-top: 30px;">Or, if this event is no longer running, you can <a href="{{remove_url}}">request removal here</a>.</p>\n' +
    '<p>Best,<br>{{sender_name}}<br>Founder, Brakebee</p>\n' +
    '<p style="font-size: 12px; color: #999;">P.S. - Brakebee is free for event organizers. We built this to make festival management easier for everyone.</p>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

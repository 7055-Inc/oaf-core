module.exports = {
  template_key: 'promoter_claim_day7',
  name: 'Promoter - Day 7 Follow-up',
  subject_template: 'Artists are asking about {{event_name}}',
  body_template: '<p>Hi {{promoter_first_name|default:\"there\"}},</p>\n' +
    '<p>Just a quick follow-up — artists are saving <strong>{{event_name}}</strong> to track your application deadline, but we still don\'t have complete details listed.</p>\n' +
    '<div style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3;">\n' +
    '  <strong>{{artist_count|default:\"Artists are\"}} tracking your event</strong> to see when applications open and what booth fees are.\n' +
    '</div>\n' +
    '<p>To help them find accurate information (and connect with interested artists), claim your event listing:</p>\n' +
    '<div style="text-align: center; margin: 30px 0;">\n' +
    '  <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event</a>\n' +
    '</div>\n' +
    '<p><strong>Once claimed, you\'ll be able to:</strong></p>\n' +
    '<ul>\n' +
    '  <li>Update all event details</li>\n' +
    '  <li>See which artists are interested</li>\n' +
    '  <li>Accept applications through the platform (no more email chaos)</li>\n' +
    '  <li>Earn commission on sales through your event site</li>\n' +
    '</ul>\n' +
    '<p>Takes 2 minutes: <a href="{{claim_url}}">{{claim_url}}</a></p>\n' +
    '<p>Best,<br>{{sender_name}}</p>\n' +
    '<p style="font-size: 12px; color: #666; margin-top: 30px;">P.S. - Not organizing {{event_name}}? <a href="{{remove_url}}">Request removal here</a>.</p>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

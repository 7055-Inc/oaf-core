module.exports = {
  template_key: 'promoter_claim_day14',
  name: 'Promoter - Day 14 Follow-up',
  subject_template: 'Last call: {{event_name}} application season approaching',
  body_template: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"there"}},</p>
  
  <p>Application season for {{event_season|default:"upcoming"}} festivals is heating up, and <strong>{{event_name}}</strong> still has an incomplete listing on Brakebee.</p>
  
  <p>Artists are planning which festivals to apply to <strong>right now</strong>. Make sure they have your complete information—especially booth fees and application deadlines.</p>
  
  <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <strong>Critical missing information:</strong><br>
    ❌ Booth fees (we only show fees from verified organizers)<br>
    ❌ Application deadline<br>
    ❌ Application requirements
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{claim_url}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Event</a>
  </div>
  
  <p><strong>Or, if you're not organizing this event:</strong><br>
  If {{event_name}} isn't running this year or you're not involved, please <a href="{{remove_url}}">request removal here</a>.</p>
  
  <p>All the best,<br>{{sender_name}}</p>
</body>
</html>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

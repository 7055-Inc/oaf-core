module.exports = {
  template_key: 'promoter_claim_day30',
  name: 'Promoter - Final Notice',
  subject_template: 'Should I remove {{event_name}}?',
  body_template: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Hi {{promoter_first_name|default:"there"}},</p>
  
  <p>I haven't heard back about the <strong>{{event_name}}</strong> listing on Brakebee, so I wanted to check in.</p>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>If you're organizing this event:</strong><br>
    The listing is here whenever you're ready to claim it and add complete details:<br>
    <a href="{{claim_url}}">{{claim_url}}</a></p>
  </div>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
    <p style="margin: 0;"><strong>If you're NOT organizing this event (or it's not happening):</strong><br>
    Please <a href="{{remove_url}}">request removal here</a>—no problem at all.</p>
  </div>
  
  <p>Thanks for your time, and best of luck with your events!</p>
  
  <p>{{sender_name}}<br>Founder, Brakebee</p>
</body>
</html>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

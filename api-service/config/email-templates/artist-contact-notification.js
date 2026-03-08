module.exports = {
  template_key: 'artist-contact-notification',
  name: 'Artist Contact Form Notification',
  subject_template: 'New Contact Form Message{{#if subject}}: {{subject}}{{/if}}',
  body_template: '<h2>New Contact Form Message</h2>\n<p>Hi {{artistName}},</p>\n<p>You have received a new message through your Brakebee artist profile:</p>\n<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">\n<p><strong>From:</strong> {{senderName}}</p>\n<p><strong>Email:</strong> <a href="mailto:{{senderEmail}}">{{senderEmail}}</a></p>\n{{#if senderPhone}}\n<p><strong>Phone:</strong> {{senderPhone}}</p>\n{{/if}}\n{{#if subject}}\n<p><strong>Subject:</strong> {{subject}}</p>\n{{/if}}\n<hr style="border: 1px solid #ddd; margin: 15px 0;">\n<p><strong>Message:</strong></p>\n<p style="white-space: pre-wrap;">{{message}}</p>\n</div>\n<p>You can reply directly to this email to respond to {{senderName}}.</p>\n<p style="margin-top: 30px;"><a href="{{profileUrl}}" style="background: #055474; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Your Profile</a></p>',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

module.exports = {
  template_key: 'artist-contact-admin-copy',
  name: 'Artist Contact Form Admin Copy',
  subject_template: 'Artist Contact Form: {{artistName}} received a message',
  body_template: '<h2>Artist Contact Form Submission</h2>\n<p>An artist has received a contact form message:</p>\n<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">\n<h3>Artist Information:</h3>\n<p><strong>Name:</strong> {{artistName}}</p>\n<p><strong>Artist ID:</strong> {{artistId}}</p>\n<p><strong>Email:</strong> <a href="mailto:{{artistEmail}}">{{artistEmail}}</a></p>\n</div>\n<div style="background: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0;">\n<h3>Sender Information:</h3>\n<p><strong>From:</strong> {{senderName}}</p>\n<p><strong>Email:</strong> <a href="mailto:{{senderEmail}}">{{senderEmail}}</a></p>\n{{#if senderPhone}}\n<p><strong>Phone:</strong> {{senderPhone}}</p>\n{{/if}}\n</div>\n<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">\n{{#if subject}}\n<p><strong>Subject:</strong> {{subject}}</p>\n{{/if}}\n<p><strong>Message:</strong></p>\n<p style="white-space: pre-wrap;">{{message}}</p>\n</div>\n<p><strong>Message ID:</strong> #{{messageId}}</p>',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

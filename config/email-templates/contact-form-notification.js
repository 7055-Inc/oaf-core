/**
 * Contact Form Notification Email Template
 * System default for contact form submissions to site owner
 */

module.exports = {
  template_key: 'contact_form_notification',
  name: 'Contact Form Notification',
  subject_template: 'New Contact Form Message - #{siteName}',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Contact Form Message',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You\'ve received a new message from your website contact form on #{siteName}.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Message Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>From:</strong> #{senderName}<br><strong>Email:</strong> #{senderEmail}<br><strong>Received:</strong> #{submittedAt}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Message',
          level: 3
        }
      },
      {
        type: 'quote',
        data: {
          text: '#{message}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="mailto:#{senderEmail}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Reply to #{senderName}</a>'
        }
      }
    ]
  },
  
  variables: ['siteName', 'senderName', 'senderEmail', 'message', 'submittedAt']
};

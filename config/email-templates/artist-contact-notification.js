/**
 * Artist Contact Form Notification Email Template
 * System default for artist site contact forms
 */

module.exports = {
  template_key: 'artist-contact-notification',
  name: 'Artist Contact Form Notification',
  subject_template: 'New Message from Your Website',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'artist_site',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Contact Message',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{artistName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You\'ve received a new message from your artist website.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'From',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Name:</strong> #{senderName}<br><strong>Email:</strong> #{senderEmail}<br><strong>Phone:</strong> #{senderPhone}'
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
          text: '<a href="mailto:#{senderEmail}?subject=Re: #{subject}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Reply to #{senderName}</a>'
        }
      }
    ]
  },
  
  variables: ['artistName', 'senderName', 'senderEmail', 'senderPhone', 'message', 'subject']
};

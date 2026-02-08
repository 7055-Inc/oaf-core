/**
 * Artist Contact Form Admin Copy Email Template
 * System default for admin copies of artist contact forms
 */

module.exports = {
  template_key: 'artist-contact-admin-copy',
  name: 'Artist Contact Form Admin Copy',
  subject_template: '[Admin] Contact Form: #{artistName} - #{senderName}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Artist Contact Form Submission',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Admin notification: A contact form was submitted on an artist site.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Artist Information',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Artist:</strong> #{artistName}<br><strong>Site URL:</strong> #{siteUrl}<br><strong>Artist ID:</strong> #{artistId}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Submission Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>From:</strong> #{senderName}<br><strong>Email:</strong> #{senderEmail}<br><strong>Phone:</strong> #{senderPhone}<br><strong>Submitted:</strong> #{submittedAt}'
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
      }
    ]
  },
  
  variables: ['artistName', 'siteUrl', 'artistId', 'senderName', 'senderEmail', 'senderPhone', 'message', 'submittedAt']
};

/**
 * Email Digest Template
 * System default for compiled digest emails
 */

module.exports = {
  template_key: 'digest_email',
  name: 'Email Digest',
  subject_template: 'Your #{digestPeriod} Digest - #{siteName}',
  is_transactional: false,
  priority_level: 5,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Your #{digestPeriod} Digest',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{userName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Here\'s a summary of what you missed this #{digestPeriod}.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Activity Summary',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{digestContent}'
        }
      },
      {
        type: 'delimiter',
        data: {}
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Go to Dashboard</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<small>You\'re receiving this digest based on your email preferences. <a href="#{unsubscribeLink}">Update preferences</a></small>'
        }
      }
    ]
  },
  
  variables: ['userName', 'digestPeriod', 'siteName', 'digestContent', 'dashboardLink', 'unsubscribeLink']
};

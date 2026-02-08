/**
 * Marketplace Application Submitted Email Template
 * System default for marketplace application submissions
 */

module.exports = {
  template_key: 'marketplace_application_submitted',
  name: 'Marketplace Application Submitted',
  subject_template: 'Marketplace Application Received',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Application Received!',
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
          text: 'Thank you for applying to become a seller on the Brakebee Marketplace! We\'ve received your application and it\'s currently under review.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What Happens Next?',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'ordered',
          items: [
            'Our team will review your application and portfolio',
            'We\'ll evaluate your work against our marketplace criteria',
            'You\'ll receive a decision via email within #{reviewTimeframe}',
            'If approved, you\'ll get immediate access to your seller dashboard'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applicationStatusLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Check Application Status</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for your interest in joining the Brakebee community!'
        }
      }
    ]
  },
  
  variables: ['artistName', 'reviewTimeframe', 'applicationStatusLink']
};

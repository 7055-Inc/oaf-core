/**
 * Promoter Onboarding Accept Applications Email Template
 * System default for promoter onboarding series - Accept Applications
 */

module.exports = {
  template_key: 'onboarding_accept_applications',
  name: 'Promoter Onboarding: Start Accepting Applications',
  subject_template: 'Ready to Accept Vendor Applications?',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Start Accepting Applications',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{promoterName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Your event profile looks great! You\'re ready to start accepting vendor applications.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Before Opening Applications',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Set your application deadline',
            'Define booth fee and payment terms',
            'Configure approval workflow',
            'Prepare your review criteria',
            'Set up automated responses'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applicationSettingsLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Open Applications</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'applicationSettingsLink']
};

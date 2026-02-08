/**
 * Marketplace Application Denied Email Template
 * System default for denied marketplace applications
 */

module.exports = {
  template_key: 'marketplace_application_denied',
  name: 'Marketplace Application Denied',
  subject_template: 'Marketplace Application Update',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Application Update',
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
          text: 'Thank you for your interest in joining the Brakebee Marketplace. After careful review, we\'re unable to approve your application at this time.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Reason for Decision',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{denialReason}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What You Can Do',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You\'re welcome to reapply in the future. Please address the concerns mentioned above and submit a new application when you\'re ready.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have questions about this decision, please contact us at #{contactEmail}.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'denialReason', 'contactEmail']
};

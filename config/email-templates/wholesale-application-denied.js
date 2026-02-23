/**
 * Wholesale Application Denied Email Template
 * Sent to applicant when their wholesale application is denied
 */

module.exports = {
  template_key: 'wholesale_application_denied',
  name: 'Wholesale Application Denied',
  subject_template: 'Wholesale Application Update - Brakebee',
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
          text: 'Hi #{contactName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for your interest in the Brakebee Wholesale Program. After reviewing your application for #{businessName}, we\'re unable to approve it at this time.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Reason:</strong> #{denialReason}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{reapplicationMessage}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have questions about this decision or need further information, please don\'t hesitate to reach out to our team.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="mailto:#{supportEmail}" style="display: inline-block; padding: 12px 24px; background-color: #6c757d; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Contact Support</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We appreciate your interest in Brakebee and wish you the best.'
        }
      }
    ]
  },
  
  variables: ['contactName', 'businessName', 'denialReason', 'reapplicationMessage', 'supportEmail']
};

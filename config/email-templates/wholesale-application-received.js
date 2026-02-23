/**
 * Wholesale Application Received Email Template
 * Sent to applicant when their wholesale application is submitted
 */

module.exports = {
  template_key: 'wholesale_application_received',
  name: 'Wholesale Application Received',
  subject_template: 'Wholesale Application Received - Brakebee',
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
          text: 'Hi #{contactName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for applying to the Brakebee Wholesale Program on behalf of #{businessName}. We\'ve received your application and it\'s currently under review.'
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
            'Our team will review your business information and credentials',
            'We may reach out for additional documentation if needed',
            'You\'ll receive a decision via email within 3-5 business days',
            'If approved, wholesale pricing will be activated on your account immediately'
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
          text: 'Thank you for your interest in partnering with Brakebee!'
        }
      }
    ]
  },
  
  variables: ['contactName', 'businessName', 'applicationStatusLink']
};

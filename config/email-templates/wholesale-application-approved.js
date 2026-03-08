/**
 * Wholesale Application Approved Email Template
 * Sent to applicant when their wholesale application is approved
 */

module.exports = {
  template_key: 'wholesale_application_approved',
  name: 'Wholesale Application Approved',
  subject_template: 'Welcome to Brakebee Wholesale!',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Congratulations! You\'re Approved!',
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
          text: 'Great news! Your wholesale application for #{businessName} has been approved. You now have access to exclusive wholesale pricing across the Brakebee marketplace.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What\'s Available to You',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Exclusive wholesale pricing on eligible products',
            'Volume pricing tiers for larger orders',
            'Priority customer support',
            'Early access to new collections'
          ]
        }
      },
      {
        type: 'header',
        data: {
          text: 'Getting Started',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'ordered',
          items: [
            'Browse products — wholesale pricing is displayed automatically',
            'Look for volume tier pricing on select products for additional savings',
            'Add items to your cart and check out as usual',
            'Note any per-product or per-vendor order minimums'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Start Shopping Wholesale</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Welcome to the Brakebee Wholesale program! We\'re excited to have you.'
        }
      }
    ]
  },
  
  variables: ['contactName', 'businessName', 'dashboardLink']
};

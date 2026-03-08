/**
 * Marketplace Application Approved Email Template
 * System default for approved marketplace applications
 */

module.exports = {
  template_key: 'marketplace_application_approved',
  name: 'Marketplace Application Approved',
  subject_template: 'Welcome to Brakebee Marketplace!',
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
          text: 'Hi #{artistName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Great news! Your application to join the Brakebee Marketplace has been approved. You can now start selling your work to our community.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Next Steps',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'ordered',
          items: [
            'Set up your artist profile and shop',
            'Upload your first products',
            'Set your pricing and shipping options',
            'Review our seller guidelines',
            'Start accepting orders!'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Go to Your Dashboard</a>'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Seller Resources',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{sellerGuidelinesLink}<br>#{shippingPoliciesLink}<br>#{marketplaceFaqLink}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Welcome to the Brakebee Marketplace community! We\'re excited to have you.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'dashboardLink', 'sellerGuidelinesLink', 'shippingPoliciesLink', 'marketplaceFaqLink']
};

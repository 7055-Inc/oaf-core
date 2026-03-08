/**
 * Promoter Onboarding Review Applications Email Template
 * System default for promoter onboarding series - Review Tips
 */

module.exports = {
  template_key: 'onboarding_review_applications',
  name: 'Promoter Onboarding: Tips for Reviewing Applications',
  subject_template: 'Tips for Reviewing Vendor Applications',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Reviewing Applications',
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
          text: 'Applications are coming in! Here are some tips for reviewing and selecting the best vendors for your event.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Review Criteria',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Product quality and uniqueness',
            'Booth presentation and professionalism',
            'Vendor experience at similar events',
            'Complementary mix of vendors',
            'Customer reviews and ratings'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applicationsLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Review Applications</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'applicationsLink']
};

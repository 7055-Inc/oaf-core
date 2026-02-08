/**
 * Promoter Onboarding Marketing Materials Email Template
 * System default for promoter onboarding series - Marketing
 */

module.exports = {
  template_key: 'onboarding_marketing_materials',
  name: 'Promoter Onboarding: Marketing Materials',
  subject_template: 'Promote Your Event Effectively',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Marketing Your Event',
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
          text: 'Great events need great marketing! Use these tools and tips to get the word out about #{eventTitle}.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Marketing Tools',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Shareable event page link',
            'Social media graphics',
            'Email marketing templates',
            'Printable flyers and posters',
            'Vendor cross-promotion'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{marketingLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Access Marketing Tools</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'eventTitle', 'marketingLink']
};

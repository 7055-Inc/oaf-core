/**
 * Promoter Onboarding Advanced Features Email Template
 * System default for promoter onboarding series - Advanced
 */

module.exports = {
  template_key: 'onboarding_advanced_features',
  name: 'Promoter Onboarding: Advanced Features',
  subject_template: 'Unlock Advanced Event Management Features',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Advanced Features',
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
          text: 'Now that you\'re familiar with the basics, explore these advanced features to take your event management to the next level.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Power User Features',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Automated vendor communications',
            'Custom application questions',
            'Booth assignment tools',
            'Sales and revenue analytics',
            'Bulk vendor messaging',
            'Event series management'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{advancedFeaturesLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Explore Advanced Features</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'advancedFeaturesLink']
};

/**
 * Promoter Onboarding Welcome Email Template
 * System default for promoter onboarding series - Day 1
 */

module.exports = {
  template_key: 'onboarding_welcome',
  name: 'Promoter Onboarding: Welcome',
  subject_template: 'Welcome to Brakebee Event Management!',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Welcome to Brakebee!',
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
          text: 'Congratulations on claiming your event! We\'re excited to help you manage #{eventTitle} and connect you with talented artists and vendors.'
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
            'Complete your event profile',
            'Set up your application process',
            'Configure booth fees and payments',
            'Start accepting applications'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Go to Dashboard</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Over the next few weeks, we\'ll send you helpful tips and guides to make the most of your event management tools.'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'eventTitle', 'dashboardLink']
};

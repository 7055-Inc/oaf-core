/**
 * Welcome Email Template
 * System default for new user registration
 */

module.exports = {
  template_key: 'welcome',
  name: 'Welcome to Brakebee',
  subject_template: 'Welcome to #{siteName}!',
  is_transactional: true,
  priority_level: 4,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Welcome to #{siteName}!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{firstName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for joining #{siteName}! We\'re excited to have you as part of our community.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Get Started',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Complete your profile to personalize your experience',
            'Explore our features and discover what we offer',
            'Connect with other members of our community',
            'Check out our help center if you have questions'
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
          text: 'If you have any questions, feel free to reply to this email. We\'re here to help!'
        }
      }
    ]
  },
  
  variables: ['firstName', 'siteName', 'dashboardLink']
};

/**
 * Promoter Onboarding Complete Event Email Template
 * System default for promoter onboarding series - Complete Profile
 */

module.exports = {
  template_key: 'onboarding_complete_event',
  name: 'Promoter Onboarding: Complete Event Profile',
  subject_template: 'Tip: Complete Your Event Profile',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Complete Your Event Profile',
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
          text: 'A complete event profile helps artists understand your event and makes their application decision easier.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What to Include',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Event description and theme',
            'Expected attendance numbers',
            'Booth size and amenities',
            'Load-in and event schedule',
            'Location details and parking'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{eventSettingsLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Update Event Profile</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'eventSettingsLink']
};

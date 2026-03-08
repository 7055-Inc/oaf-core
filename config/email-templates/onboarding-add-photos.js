/**
 * Promoter Onboarding Add Photos Email Template
 * System default for promoter onboarding series - Add Photos
 */

module.exports = {
  template_key: 'onboarding_add_photos',
  name: 'Promoter Onboarding: Add Event Photos',
  subject_template: 'Showcase Your Event with Photos',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Add Photos to Your Event',
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
          text: 'Events with photos get 3x more applications! Help artists visualize your event by adding great photos.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Photo Tips',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Showcase your venue and layout',
            'Include photos from previous events',
            'Show the crowd and atmosphere',
            'Highlight vendor booth setups',
            'Use high-quality, well-lit images'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{uploadPhotosLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Add Photos</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'uploadPhotosLink']
};

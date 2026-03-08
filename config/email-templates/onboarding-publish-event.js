/**
 * Promoter Onboarding Publish Event Email Template
 * System default for promoter onboarding series - Publish
 */

module.exports = {
  template_key: 'onboarding_publish_event',
  name: 'Promoter Onboarding: Publish Your Event',
  subject_template: 'Ready to Publish Your Event?',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Publish Your Event',
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
          text: 'Your event is all set up! When you\'re ready, publish it to make it visible to artists searching for events like yours.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Pre-Launch Checklist',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            '✓ Event details are complete',
            '✓ Photos are uploaded',
            '✓ Application settings configured',
            '✓ Booth fees and deadlines set',
            '✓ Ready to review applications'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{publishLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Publish Event</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'publishLink']
};

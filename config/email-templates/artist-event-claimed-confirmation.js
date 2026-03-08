/**
 * Artist Event Claimed Confirmation Email Template
 * System default for confirming event claims
 */

module.exports = {
  template_key: 'artist_event_claimed_confirmation',
  name: 'Artist Event Claimed Confirmation',
  subject_template: 'Event Claimed Successfully - #{eventTitle}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Event Claimed!',
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
          text: 'You\'ve successfully claimed "#{eventTitle}"! You now have full access to manage your event.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What You Can Do Now',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Review and manage vendor applications',
            'Update event details and settings',
            'Track payments and booth assignments',
            'Communicate with applicants',
            'Access event analytics'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{dashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Go to Event Dashboard</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Need help getting started? Check out our #{guideLink} or contact support.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'dashboardLink', 'guideLink']
};

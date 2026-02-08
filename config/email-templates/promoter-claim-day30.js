/**
 * Promoter Claim Day 30 Final Notice Email Template
 * System default for final notice on claim invitations
 */

module.exports = {
  template_key: 'promoter_claim_day30',
  name: 'Promoter - Final Notice',
  subject_template: 'Final Notice: Claim Your Event',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Final Reminder',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hello,'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'This is the final reminder that your link to claim "#{eventTitle}" expires today.'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Last Chance',
          message: 'After today, this link will no longer work and you\'ll need to verify your identity to claim your event.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{claimLink}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Claim Event Now</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you\'re not interested in claiming this event, you can safely ignore this message. We won\'t contact you about it again.'
        }
      }
    ]
  },
  
  variables: ['eventTitle', 'claimLink']
};

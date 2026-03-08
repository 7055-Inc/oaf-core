/**
 * Promoter Claim Initial Request Email Template
 * System default for initial promoter claim request
 */

module.exports = {
  template_key: 'promoter_claim_initial',
  name: 'Promoter - Initial Claim Request',
  subject_template: 'Claim Your Event on Brakebee',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Claim Your Event',
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
          text: 'We\'ve added your event "#{eventTitle}" to Brakebee to help you connect with artists and vendors. Claim your event now to unlock powerful management tools.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{claimLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Claim Your Event</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'This link is unique to you and will expire in #{expirationDays} days.'
        }
      }
    ]
  },
  
  variables: ['eventTitle', 'claimLink', 'expirationDays']
};

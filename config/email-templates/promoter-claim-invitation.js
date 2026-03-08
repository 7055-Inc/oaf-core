/**
 * Promoter Event Claim Invitation Email Template
 * System default for inviting promoters to claim their events
 */

module.exports = {
  template_key: 'promoter_claim_invitation',
  name: 'Promoter Event Claim Invitation',
  subject_template: 'Claim Your Event on Brakebee - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
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
          text: 'Hi #{promoterName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We\'ve noticed your event "#{eventTitle}" on Brakebee. Claim it now to manage applications, communicate with vendors, and access powerful event management tools.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Benefits of Claiming Your Event',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Manage vendor applications and approvals',
            'Communicate directly with applicants',
            'Track payments and booth assignments',
            'Access analytics and reporting',
            'Update event details anytime'
          ]
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
          text: 'This invitation is specifically for you and expires in #{expirationDays} days.'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'eventTitle', 'claimLink', 'expirationDays']
};

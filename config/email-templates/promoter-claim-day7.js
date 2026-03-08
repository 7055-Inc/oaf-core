/**
 * Promoter Claim Day 7 Follow-up Email Template
 * System default for 7-day follow-up on claim invitations
 */

module.exports = {
  template_key: 'promoter_claim_day7',
  name: 'Promoter - Day 7 Follow-up',
  subject_template: 'Reminder: Claim Your Event - #{eventTitle}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Don\'t Miss Out',
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
          text: 'Just a quick reminder that you can claim "#{eventTitle}" on Brakebee and start managing vendor applications right away.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Artists are already discovering your event. Claim it now to:'
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Review and approve vendor applications',
            'Collect booth fees online',
            'Communicate with applicants',
            'Update event details'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{claimLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Claim Event Now</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Your claim link expires in #{daysRemaining} days.'
        }
      }
    ]
  },
  
  variables: ['eventTitle', 'claimLink', 'daysRemaining']
};

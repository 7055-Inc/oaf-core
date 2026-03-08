/**
 * Promoter Claim Day 14 Follow-up Email Template
 * System default for 14-day follow-up on claim invitations
 */

module.exports = {
  template_key: 'promoter_claim_day14',
  name: 'Promoter - Day 14 Follow-up',
  subject_template: 'Your Event Claim Link Expires Soon',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Claim Link Expires Soon',
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
          text: 'Your exclusive link to claim "#{eventTitle}" on Brakebee expires in #{daysRemaining} days.'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Time Running Out',
          message: 'After the link expires, you\'ll need to go through a verification process to claim your event.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{claimLink}" style="display: inline-block; padding: 12px 24px; background-color: #ffc107; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Claim Before It\'s Too Late</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Have questions? Reply to this email and we\'ll be happy to help.'
        }
      }
    ]
  },
  
  variables: ['eventTitle', 'daysRemaining', 'claimLink']
};

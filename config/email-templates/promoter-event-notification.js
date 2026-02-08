/**
 * Promoter Event Claim Notification Email Template
 * System default for notifying promoters about new claims
 */

module.exports = {
  template_key: 'promoter_event_notification',
  name: 'Promoter Event Claim Notification',
  subject_template: 'New Application for #{eventTitle}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Vendor Application',
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
          text: 'You have a new vendor application for #{eventTitle}.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Applicant Information',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Vendor:</strong> #{vendorName}<br><strong>Business:</strong> #{businessName}<br><strong>Applied:</strong> #{applicationDate}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applicationLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Review Application</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Log in to your promoter dashboard to review the full application and make a decision.'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'eventTitle', 'vendorName', 'businessName', 'applicationDate', 'applicationLink']
};

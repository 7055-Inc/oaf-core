/**
 * Series Renewal Reminder Email Template
 * System default for series subscription renewals
 */

module.exports = {
  template_key: 'series_renewal_reminder',
  name: 'Series Renewal Reminder',
  subject_template: 'Renew Your #{seriesName} Membership',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Membership Renewal',
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
          text: 'Your membership to #{seriesName} expires soon. Renew now to continue enjoying exclusive benefits and priority access to events.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Membership Benefits',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Priority application processing',
            'Discounted booth fees',
            'Early access to new events',
            'Exclusive member events',
            'Enhanced profile visibility'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Renewal Fee:</strong> #{renewalFee}<br><strong>Current Membership Expires:</strong> #{expirationDate}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{renewLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Renew Membership</a>'
        }
      }
    ]
  },
  
  variables: ['artistName', 'seriesName', 'renewalFee', 'expirationDate', 'renewLink']
};

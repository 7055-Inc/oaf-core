/**
 * Promoter Onboarding Create Tickets Email Template
 * System default for promoter onboarding series - Ticket Sales
 */

module.exports = {
  template_key: 'onboarding_create_tickets',
  name: 'Promoter Onboarding: Set Up Ticket Sales',
  subject_template: 'Boost Revenue with Ticket Sales',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Set Up Ticket Sales',
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
          text: 'Did you know you can sell tickets directly through Brakebee? It\'s easy to set up and helps you manage attendance.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Ticket Features',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Multiple ticket types (GA, VIP, early bird)',
            'Automatic confirmation emails',
            'Real-time sales tracking',
            'Digital ticket delivery',
            'QR code check-in'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{ticketSettingsLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Set Up Tickets</a>'
        }
      }
    ]
  },
  
  variables: ['promoterName', 'ticketSettingsLink']
};

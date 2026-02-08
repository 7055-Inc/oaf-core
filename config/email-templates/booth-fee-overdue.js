/**
 * Booth Fee Overdue Notice Email Template
 * System default for overdue booth fee payments
 */

module.exports = {
  template_key: 'booth_fee_overdue',
  name: 'Booth Fee Overdue Notice',
  subject_template: 'URGENT: Payment Overdue - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Payment Overdue',
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
          text: 'Your booth fee payment for #{eventTitle} is now overdue. Your booth space is at risk of being forfeited.'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Immediate Action Required',
          message: 'Please submit payment immediately to secure your booth space. Failure to pay may result in your application being cancelled.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Payment Information',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Amount Due:</strong> #{amountDue}<br><strong>Original Due Date:</strong> #{originalDueDate}<br><strong>Days Overdue:</strong> #{daysOverdue}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{paymentLink}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Pay Now</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have questions or are experiencing difficulties with payment, please contact us immediately at #{contactEmail} or #{contactPhone}.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'amountDue', 'originalDueDate', 'daysOverdue', 'paymentLink', 'contactEmail', 'contactPhone']
};

/**
 * Booth Fee Reminder Email Template
 * System default for booth fee payment reminders
 */

module.exports = {
  template_key: 'booth_fee_reminder',
  name: 'Booth Fee Reminder',
  subject_template: 'Payment Reminder - #{eventTitle}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Payment Reminder',
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
          text: 'This is a friendly reminder that your booth fee payment for #{eventTitle} is due soon.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Payment Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Amount Due:</strong> #{amountDue}<br><strong>Due Date:</strong> #{dueDate}<br><strong>Days Remaining:</strong> #{daysRemaining}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{paymentLink}" style="display: inline-block; padding: 12px 24px; background-color: #ffc107; color: #000000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Complete Payment</a>'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Action Required',
          message: 'Please complete your payment by #{dueDate} to avoid losing your booth space.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you\'ve already paid or have questions about your payment, please contact us.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'amountDue', 'dueDate', 'daysRemaining', 'paymentLink']
};

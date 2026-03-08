/**
 * Booth Fee Invoice Email Template
 * System default for booth fee invoices
 */

module.exports = {
  template_key: 'booth_fee_invoice',
  name: 'Booth Fee Invoice',
  subject_template: 'Booth Fee Invoice - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Booth Fee Invoice',
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
          text: 'Congratulations! Your application for #{eventTitle} has been approved. Please complete your payment to secure your booth space.'
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
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Booth Fee:</strong> #{boothFee}<br><strong>Due Date:</strong> #{dueDate}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{paymentLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Pay Booth Fee Now</a>'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Payment Deadline',
          message: 'Please complete your payment by #{dueDate} to secure your booth space. Late payments may result in forfeiture of your spot.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'After payment, you\'ll receive a confirmation email with additional event details and vendor guidelines.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'boothFee', 'dueDate', 'paymentLink']
};

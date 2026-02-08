/**
 * Booth Fee Payment Confirmation Email Template
 * System default for booth fee payment confirmations
 */

module.exports = {
  template_key: 'booth_fee_confirmation',
  name: 'Booth Fee Payment Confirmation',
  subject_template: 'Payment Confirmed - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Payment Confirmed!',
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
          text: 'Thank you! Your booth fee payment has been received and your spot at #{eventTitle} is now confirmed.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Confirmation Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Amount Paid:</strong> #{amountPaid}<br><strong>Payment Date:</strong> #{paymentDate}<br><strong>Booth Number:</strong> #{boothNumber}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{receiptLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Receipt</a>'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Next Steps',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            'Review the vendor guidelines and event schedule',
            'Prepare your booth setup and inventory',
            'Note the load-in time: #{loadInTime}',
            'Contact the organizer if you have any questions'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We\'re excited to have you at the event!'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'amountPaid', 'paymentDate', 'boothNumber', 'receiptLink', 'loadInTime']
};

/**
 * Payment Received Email Template
 * System default for payment confirmation
 */

module.exports = {
  template_key: 'payment-received',
  name: 'Payment Received',
  subject_template: 'Payment Received - #{invoiceNumber}',
  is_transactional: true,
  priority_level: 5,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Payment Received',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{customerName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you! We\'ve received your payment and your account has been updated.'
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
          text: '<strong>Invoice Number:</strong> #{invoiceNumber}<br><strong>Amount Paid:</strong> #{amount}<br><strong>Payment Method:</strong> #{paymentMethod}<br><strong>Date:</strong> #{paymentDate}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{receiptLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Receipt</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'A receipt for this payment has been attached to this email and is also available in your account dashboard.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for your business!'
        }
      }
    ]
  },
  
  variables: ['customerName', 'invoiceNumber', 'amount', 'paymentMethod', 'paymentDate', 'receiptLink']
};

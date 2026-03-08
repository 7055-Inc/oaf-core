/**
 * Order Confirmation Email Template
 * System default for order confirmations
 */

module.exports = {
  template_key: 'order-confirmation',
  name: 'Order Confirmation',
  subject_template: 'Order Confirmation - #{orderNumber}',
  is_transactional: true,
  priority_level: 5,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Order Confirmed!',
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
          text: 'Thank you for your order! We\'ve received your payment and are processing your order.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Order Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Order Date:</strong> #{orderDate}<br><strong>Total Amount:</strong> #{orderTotal}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{itemsList}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What\'s Next?',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We\'ll send you another email once your order has shipped with tracking information.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Order Details</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have any questions about your order, please don\'t hesitate to contact us.'
        }
      }
    ]
  },
  
  variables: ['customerName', 'orderNumber', 'orderDate', 'orderTotal', 'itemsList', 'orderLink']
};

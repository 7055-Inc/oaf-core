/**
 * Order Delivered Email Template
 * System default for order delivery confirmations
 */

module.exports = {
  template_key: 'order_delivered',
  name: 'Order Delivered Notification',
  subject_template: 'Your Order Has Been Delivered - #{orderNumber}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Your Order Has Been Delivered!',
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
          text: 'Your order has been successfully delivered! We hope you love your purchase.'
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
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Delivered:</strong> #{deliveredDate}<br><strong>Delivery Location:</strong> #{deliveryLocation}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Order Details</a>'
        }
      },
      {
        type: 'delimiter',
        data: {}
      },
      {
        type: 'header',
        data: {
          text: 'How Was Your Experience?',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We\'d love to hear your feedback! #{reviewLink}'
        }
      }
    ]
  },
  
  variables: ['customerName', 'orderNumber', 'deliveredDate', 'deliveryLocation', 'orderLink', 'reviewLink']
};

/**
 * Shipping Notification Email Template
 * System default for order shipped notifications
 */

module.exports = {
  template_key: 'shipping-notification',
  name: 'Shipping Notification',
  subject_template: 'Your Order Has Shipped - #{orderNumber}',
  is_transactional: true,
  priority_level: 4,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Your Order is On Its Way!',
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
          text: 'Great news! Your order has been shipped and is on its way to you.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Shipping Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Tracking Number:</strong> #{trackingNumber}<br><strong>Carrier:</strong> #{carrier}<br><strong>Estimated Delivery:</strong> #{estimatedDelivery}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{trackingLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Track Your Package</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You can track your package using the link above or by visiting the carrier\'s website and entering your tracking number.'
        }
      },
      {
        type: 'delimiter',
        data: {}
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have any questions about your shipment, please don\'t hesitate to contact us.'
        }
      }
    ]
  },
  
  variables: ['customerName', 'orderNumber', 'trackingNumber', 'carrier', 'estimatedDelivery', 'trackingLink']
};

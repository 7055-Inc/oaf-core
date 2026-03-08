/**
 * Vendor Order Notification Email Template
 * System default for notifying vendors of new orders
 */

module.exports = {
  template_key: 'vendor_order_notification',
  name: 'Vendor Order Notification',
  subject_template: 'New Order: #{orderNumber}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Order Received!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{vendorName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You\'ve received a new order! Here are the details:'
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
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Customer:</strong> #{customerName}<br><strong>Order Date:</strong> #{orderDate}<br><strong>Total:</strong> #{orderTotal}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Items Ordered',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{orderItems}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Full Order</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Please process this order and mark it as shipped once it\'s on its way.'
        }
      }
    ]
  },
  
  variables: ['vendorName', 'orderNumber', 'customerName', 'orderDate', 'orderTotal', 'orderItems', 'orderLink']
};

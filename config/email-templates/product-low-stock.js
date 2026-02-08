/**
 * Product Low Stock Alert Email Template
 * System default for low stock notifications
 */

module.exports = {
  template_key: 'product_low_stock',
  name: 'Product Low Stock Alert',
  subject_template: 'Low Stock Alert: #{productName}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Low Stock Alert',
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
          text: 'Your product "#{productName}" is running low on stock.'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Stock Status',
          message: 'Only #{remainingStock} units remaining. Consider restocking to avoid running out.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Product Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Product:</strong> #{productName}<br><strong>Current Stock:</strong> #{remainingStock}<br><strong>Recent Sales:</strong> #{recentSales} in last 7 days'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{inventoryLink}" style="display: inline-block; padding: 12px 24px; background-color: #ffc107; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Update Inventory</a>'
        }
      }
    ]
  },
  
  variables: ['artistName', 'productName', 'remainingStock', 'recentSales', 'inventoryLink']
};

/**
 * New Product Notification Email Template
 * System default for new product announcements
 */

module.exports = {
  template_key: 'new_product',
  name: 'New Product Notification',
  subject_template: 'New: #{productName} from #{artistName}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Product Available',
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
          text: '#{artistName} just added a new product you might like!'
        }
      },
      {
        type: 'header',
        data: {
          text: '#{productName}',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{productImage}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{productDescription}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Price:</strong> #{productPrice}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{productLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Product</a>'
        }
      }
    ]
  },
  
  variables: ['customerName', 'artistName', 'productName', 'productDescription', 'productPrice', 'productImage', 'productLink']
};

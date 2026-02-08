/**
 * Product Update Notification Email Template
 * System default for product update announcements
 */

module.exports = {
  template_key: 'product_update',
  name: 'Product Update Notification',
  subject_template: 'Updated: #{productName}',
  is_transactional: false,
  priority_level: 4,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Product Update',
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
          text: '#{artistName} has updated one of their products.'
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
          text: '#{updateDescription}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{productLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">See What\'s New</a>'
        }
      }
    ]
  },
  
  variables: ['customerName', 'artistName', 'productName', 'updateDescription', 'productLink']
};

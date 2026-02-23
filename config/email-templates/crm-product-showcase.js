/**
 * CRM - Product Showcase
 * Beginner+ tier. Highlight products with image and CTA blocks.
 */

module.exports = {
  template_key: 'product-showcase',
  name: 'Product Showcase',
  subject_template: '#{subject_line}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',

  body_template: {
    blocks: [
      {
        type: 'header',
        data: { text: 'New Arrivals', level: 2 }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{first_name},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Check out our latest collection. We think you\'ll love it.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{message}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{cta_url}" style="display: inline-block; padding: 12px 24px; background-color: #055474; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">#{cta_text}</a>'
        }
      }
    ]
  },

  variables: ['subject_line', 'first_name', 'last_name', 'email', 'message', 'cta_url', 'cta_text']
};

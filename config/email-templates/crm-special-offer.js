/**
 * CRM - Special Offer
 * Pro tier. Promotional layout with hero-style CTA.
 */

module.exports = {
  template_key: 'special-offer',
  name: 'Special Offer',
  subject_template: '#{subject_line}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',

  body_template: {
    blocks: [
      {
        type: 'header',
        data: { text: '#{offer_title}', level: 2 }
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
          text: '#{offer_subtitle}'
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
          text: '<a href="#{cta_url}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #055474, #0a7ba5); color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px; margin: 24px 0;">#{cta_text}</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Offer valid for a limited time. Don\'t miss out!'
        }
      }
    ]
  },

  variables: ['subject_line', 'first_name', 'last_name', 'email', 'message', 'offer_title', 'offer_subtitle', 'cta_url', 'cta_text']
};

/**
 * CRM - Simple Announcement (Basic Email)
 * Free tier only. Clean, minimal layout for quick updates.
 */

module.exports = {
  template_key: 'simple-announcement',
  name: 'Simple Announcement',
  subject_template: '#{subject_line}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',

  body_template: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{first_name},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We wanted to share a quick update with you. Stay tuned for more from us soon.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for being part of our community.'
        }
      }
    ]
  },

  variables: ['subject_line', 'first_name', 'last_name', 'email']
};

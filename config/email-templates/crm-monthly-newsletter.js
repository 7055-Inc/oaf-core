/**
 * CRM - Monthly Newsletter
 * Beginner+ tier. Structured layout for recurring newsletter content.
 */

module.exports = {
  template_key: 'monthly-newsletter',
  name: 'Monthly Newsletter',
  subject_template: '#{subject_line}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',

  body_template: {
    blocks: [
      {
        type: 'header',
        data: { text: 'Monthly Update', level: 2 }
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
          text: '#{message}'
        }
      },
      {
        type: 'header',
        data: { text: 'In This Issue', level: 3 }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: ['Featured updates', 'Latest news', 'Upcoming events']
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for reading. We appreciate your support!'
        }
      }
    ]
  },

  variables: ['subject_line', 'first_name', 'last_name', 'email', 'message']
};

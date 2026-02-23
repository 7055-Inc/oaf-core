/**
 * CRM - Event Invitation
 * Beginner+ tier. Invite subscribers to events with date and RSVP.
 */

module.exports = {
  template_key: 'event-invitation',
  name: 'Event Invitation',
  subject_template: '#{subject_line}',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',

  body_template: {
    blocks: [
      {
        type: 'header',
        data: { text: 'You\'re Invited', level: 2 }
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
        type: 'paragraph',
        data: {
          text: '<strong>When:</strong> #{event_date}<br><strong>Where:</strong> #{event_location}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{rsvp_url}" style="display: inline-block; padding: 12px 24px; background-color: #055474; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">RSVP Now</a>'
        }
      }
    ]
  },

  variables: ['subject_line', 'first_name', 'last_name', 'email', 'message', 'event_date', 'event_location', 'rsvp_url']
};

/**
 * New Series Event Created Email Template
 * System default for new event in series notifications
 */

module.exports = {
  template_key: 'series_event_created',
  name: 'New Series Event Created',
  subject_template: 'New Event: #{eventTitle} - #{seriesName}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'New Event Announced!',
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
          text: 'A new event has been added to the #{seriesName} series!'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Event Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Location:</strong> #{eventLocation}<br><strong>Application Deadline:</strong> #{applicationDeadline}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applyLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Apply Now</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Applications are filling up fast. Apply early to secure your spot!'
        }
      }
    ]
  },
  
  variables: ['artistName', 'seriesName', 'eventTitle', 'eventDate', 'eventLocation', 'applicationDeadline', 'applyLink']
};

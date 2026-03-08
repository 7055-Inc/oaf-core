/**
 * Series Application Deadline Approaching Email Template
 * System default for series deadline reminders
 */

module.exports = {
  template_key: 'series_deadline_reminder',
  name: 'Application Deadline Approaching',
  subject_template: 'Deadline Approaching: #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Application Deadline Soon',
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
          text: 'The application deadline for #{eventTitle} is approaching!'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Time Running Out',
          message: 'Applications close in #{daysRemaining} days. Don\'t miss your chance to participate!'
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
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Deadline:</strong> #{applicationDeadline}<br><strong>Location:</strong> #{eventLocation}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applyLink}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Apply Before It\'s Too Late</a>'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'applicationDeadline', 'eventLocation', 'daysRemaining', 'applyLink']
};

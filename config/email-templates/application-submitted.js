/**
 * Application Submitted Confirmation Email Template
 * System default for event application confirmations
 */

module.exports = {
  template_key: 'application_submitted',
  name: 'Application Submitted Confirmation',
  subject_template: 'Application Received - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Application Received!',
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
          text: 'Thank you for applying to #{eventTitle}! We\'ve successfully received your application.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Application Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Location:</strong> #{eventLocation}<br><strong>Application ID:</strong> #{applicationId}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'What\'s Next?',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'ordered',
          items: [
            'Your application is currently under review',
            'Event organizers will review all applications',
            'You\'ll receive an email notification once a decision is made',
            'Review timeline: #{reviewTimeline}'
          ]
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{applicationLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Application Status</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have any questions about your application, please contact the event organizers.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'eventDate', 'eventLocation', 'applicationId', 'reviewTimeline', 'applicationLink']
};

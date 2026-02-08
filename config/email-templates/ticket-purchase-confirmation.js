/**
 * Ticket Purchase Confirmation Email Template
 * System default for event ticket purchases
 */

module.exports = {
  template_key: 'ticket_purchase_confirmation',
  name: 'Ticket Purchase Confirmation',
  subject_template: 'Your Tickets for #{eventTitle}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Your Tickets Are Confirmed!',
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
          text: 'Thank you for your ticket purchase! We\'re excited to see you at #{eventTitle}.'
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
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Date:</strong> #{eventDate}<br><strong>Time:</strong> #{eventTime}<br><strong>Location:</strong> #{eventLocation}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Ticket Information',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Number of Tickets:</strong> #{ticketCount}<br><strong>Total Amount:</strong> #{totalAmount}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{ticketLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Your Tickets</a>'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Important',
          message: 'Please bring your ticket confirmation (digital or printed) to the event for entry.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'See you at the event!'
        }
      }
    ]
  },
  
  variables: ['customerName', 'eventTitle', 'eventDate', 'eventTime', 'eventLocation', 'orderNumber', 'ticketCount', 'totalAmount', 'ticketLink']
};

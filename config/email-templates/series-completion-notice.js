/**
 * Series Completion Notice Email Template
 * System default for series completion notifications
 */

module.exports = {
  template_key: 'series_completion_notice',
  name: 'Series Completion Notice',
  subject_template: '#{seriesName} Season Complete - Thank You!',
  is_transactional: false,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Season Complete!',
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
          text: 'The #{seriesName} season has come to an end. Thank you for being part of this incredible series!'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Season Highlights',
          level: 3
        }
      },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            '#{eventsParticipated} events participated',
            '#{totalSales} in total sales',
            '#{customersReached} customers reached',
            'Average rating: #{averageRating} stars'
          ]
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
        type: 'paragraph',
        data: {
          text: 'Registration for the next #{seriesName} season will open on #{nextSeasonDate}. As a returning member, you\'ll get early access to registration.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{feedbackLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Share Your Feedback</a>'
        }
      }
    ]
  },
  
  variables: ['artistName', 'seriesName', 'eventsParticipated', 'totalSales', 'customersReached', 'averageRating', 'nextSeasonDate', 'feedbackLink']
};

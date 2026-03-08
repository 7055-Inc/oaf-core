/**
 * Application Fee Refunded Email Template
 * System default for refunded application fees
 */

module.exports = {
  template_key: 'application_fee_refunded',
  name: 'Application Fee Refunded',
  subject_template: 'Refund Processed - #{eventTitle}',
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Refund Processed',
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
          text: 'Your application fee for #{eventTitle} has been refunded.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Refund Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Event:</strong> #{eventTitle}<br><strong>Refund Amount:</strong> #{refundAmount}<br><strong>Original Payment:</strong> #{originalAmount}<br><strong>Refund Date:</strong> #{refundDate}<br><strong>Reason:</strong> #{refundReason}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'The refund will appear in your account within 5-10 business days, depending on your financial institution.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have any questions about this refund, please contact us.'
        }
      }
    ]
  },
  
  variables: ['artistName', 'eventTitle', 'refundAmount', 'originalAmount', 'refundDate', 'refundReason']
};

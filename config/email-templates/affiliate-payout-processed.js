/**
 * Affiliate Payout Processed Email Template
 * System default for affiliate payout notifications
 */

module.exports = {
  template_key: 'affiliate_payout_processed',
  name: 'Affiliate Payout Processed',
  subject_template: 'Your Payout Has Been Processed',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Payout Processed!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{affiliateName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Good news! Your affiliate payout has been processed and is on its way.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Payout Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Payout Amount:</strong> #{payoutAmount}<br><strong>Payment Method:</strong> #{paymentMethod}<br><strong>Payout Date:</strong> #{payoutDate}<br><strong>Transaction ID:</strong> #{transactionId}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Funds should appear in your #{paymentMethod} within #{processingTime}.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'This Payment Includes',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Number of Commissions:</strong> #{commissionCount}<br><strong>Period:</strong> #{payoutPeriod}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{payoutHistoryLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Payout History</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Thank you for being a valued affiliate partner!'
        }
      }
    ]
  },
  
  variables: ['affiliateName', 'payoutAmount', 'paymentMethod', 'payoutDate', 'transactionId', 'processingTime', 'commissionCount', 'payoutPeriod', 'payoutHistoryLink']
};

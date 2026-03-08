/**
 * Affiliate Commission Cancelled Email Template
 * System default for cancelled affiliate commissions
 */

module.exports = {
  template_key: 'affiliate_commission_cancelled',
  name: 'Affiliate Commission Cancelled',
  subject_template: 'Commission Update - Order #{orderNumber}',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Commission Update',
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
          text: 'We\'re writing to notify you that a commission has been reversed due to an order cancellation or refund.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Cancellation Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Original Commission:</strong> #{commissionAmount}<br><strong>Reason:</strong> #{cancellationReason}<br><strong>Date:</strong> #{cancellationDate}'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Commission Reversed',
          message: 'This commission has been deducted from your pending balance.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Updated Balance',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Pending Earnings:</strong> #{updatedPendingEarnings}<br><strong>Total Paid:</strong> #{paidEarnings}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{affiliateDashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Affiliate Dashboard</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you have questions about this cancellation, please contact us.'
        }
      }
    ]
  },
  
  variables: ['affiliateName', 'orderNumber', 'commissionAmount', 'cancellationReason', 'cancellationDate', 'updatedPendingEarnings', 'paidEarnings', 'affiliateDashboardLink']
};

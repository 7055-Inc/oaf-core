/**
 * Affiliate Commission Earned Email Template
 * System default for affiliate commission notifications
 */

module.exports = {
  template_key: 'affiliate_commission_earned',
  name: 'Affiliate Commission Earned',
  subject_template: 'You Earned a Commission!',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Commission Earned!',
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
          text: 'Great news! You\'ve earned a commission from a successful referral.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Commission Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Order Number:</strong> #{orderNumber}<br><strong>Product:</strong> #{productName}<br><strong>Sale Amount:</strong> #{saleAmount}<br><strong>Your Commission:</strong> #{commissionAmount} (#{commissionRate}%)<br><strong>Date:</strong> #{commissionDate}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Your Earnings',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Total Pending:</strong> #{pendingEarnings}<br><strong>Total Paid:</strong> #{paidEarnings}<br><strong>Lifetime Earnings:</strong> #{lifetimeEarnings}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{affiliateDashboardLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Affiliate Dashboard</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Keep sharing to earn more! Commissions are paid out on #{payoutSchedule}.'
        }
      }
    ]
  },
  
  variables: ['affiliateName', 'orderNumber', 'productName', 'saleAmount', 'commissionAmount', 'commissionRate', 'commissionDate', 'pendingEarnings', 'paidEarnings', 'lifetimeEarnings', 'affiliateDashboardLink', 'payoutSchedule']
};

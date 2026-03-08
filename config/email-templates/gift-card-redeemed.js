/**
 * Gift Card Redeemed Email Template
 * System default for gift card redemption notifications
 */

module.exports = {
  template_key: 'gift_card_redeemed',
  name: 'Gift Card Redeemed',
  subject_template: 'Gift Card Used - #{giftCardCode}',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Gift Card Activity',
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
          text: 'Your gift card has been used for a purchase.'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Transaction Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Gift Card Code:</strong> #{giftCardCode}<br><strong>Amount Used:</strong> #{amountUsed}<br><strong>Remaining Balance:</strong> #{remainingBalance}<br><strong>Order Number:</strong> #{orderNumber}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Order</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'You can continue using your gift card until the balance reaches zero.'
        }
      }
    ]
  },
  
  variables: ['customerName', 'giftCardCode', 'amountUsed', 'remainingBalance', 'orderNumber', 'orderLink']
};

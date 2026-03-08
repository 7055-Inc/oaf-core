/**
 * Gift Card Received Email Template
 * System default for gift card recipient notifications
 */

module.exports = {
  template_key: 'gift_card_received',
  name: 'Gift Card Received',
  subject_template: 'You\'ve Received a Gift Card!',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'You\'ve Received a Gift!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{recipientName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{senderName} has sent you a #{giftCardAmount} gift card!'
        }
      },
      {
        type: 'quote',
        data: {
          text: '#{personalMessage}',
          caption: '— #{senderName}'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Your Gift Card',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Gift Card Code:</strong> <span style="font-family: monospace; font-size: 1.2em; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block;">#{giftCardCode}</span><br><strong>Balance:</strong> #{giftCardAmount}<br><strong>Expires:</strong> #{expirationDate}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{shopLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Start Shopping</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'To use your gift card, enter the code above at checkout. Enjoy your shopping!'
        }
      }
    ]
  },
  
  variables: ['recipientName', 'senderName', 'giftCardAmount', 'personalMessage', 'giftCardCode', 'expirationDate', 'shopLink']
};

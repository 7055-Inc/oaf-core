/**
 * Gift Card Sent Confirmation Email Template
 * System default for gift card purchase confirmations
 */

module.exports = {
  template_key: 'gift_card_sent_confirmation',
  name: 'Gift Card Sent Confirmation',
  subject_template: 'Gift Card Sent Successfully',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Gift Card Sent!',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{senderName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Your gift card has been sent to #{recipientName} (#{recipientEmail}).'
        }
      },
      {
        type: 'header',
        data: {
          text: 'Gift Card Details',
          level: 3
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<strong>Amount:</strong> #{giftCardAmount}<br><strong>Recipient:</strong> #{recipientName}<br><strong>Your Message:</strong> #{personalMessage}<br><strong>Code:</strong> #{giftCardCode}'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'The recipient has been notified via email and can start using the gift card immediately.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">View Receipt</a>'
        }
      }
    ]
  },
  
  variables: ['senderName', 'recipientName', 'recipientEmail', 'giftCardAmount', 'personalMessage', 'giftCardCode', 'orderLink']
};

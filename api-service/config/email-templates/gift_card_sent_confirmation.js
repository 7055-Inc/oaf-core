module.exports = {
  template_key: 'gift_card_sent_confirmation',
  name: 'Gift Card Sent Confirmation',
  subject_template: 'Your Brakebee gift card has been sent! ✨',
  body_template:
    '<h2>Gift Card Sent Successfully!</h2>\n' +
    '<p>Hi #{sender_name},</p>\n' +
    '<p>Your Brakebee gift card has been sent to <strong>#{recipient_email}</strong>.</p>\n' +
    '<div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0;">\n' +
    '  <h3 style="margin-top: 0;">Gift Card Details</h3>\n' +
    '  <table style="width: 100%; border-collapse: collapse;">\n' +
    '    <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Recipient:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{recipient_name}</td></tr>\n' +
    '    <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Amount:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{amount}</strong></td></tr>\n' +
    '    <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Code:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">#{gift_card_code}</td></tr>\n' +
    '    #{expiration_row}\n' +
    '  </table>\n' +
    '</div>\n' +
    '#{personal_message_block}\n' +
    '<p style="margin: 24px 0;"><a href="#{print_link}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Print Gift Card</a></p>\n' +
    '<p style="color: #6c757d; font-size: 14px;">The recipient will receive an email with their gift card code and instructions to redeem it.</p>\n' +
    '<p>Thank you for sharing the gift of handmade art!</p>\n' +
    '<p>Best regards,<br>The Brakebee Team</p>',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'default'
};

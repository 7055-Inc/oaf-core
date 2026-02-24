module.exports = {
  template_key: 'gift_card_redeemed',
  name: 'Gift Card Redeemed',
  subject_template: '✅ Gift card redeemed successfully!',
  body_template:
    '<h2>Gift Card Redeemed!</h2>\n' +
    '<p>Hi #{first_name},</p>\n' +
    '<p>You\'ve successfully redeemed your gift card.</p>\n' +
    '<div style="background: #d4edda; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">\n' +
    '  <div style="font-size: 48px; margin-bottom: 8px;">✅</div>\n' +
    '  <div style="font-size: 24px; font-weight: 600; color: #155724;">$#{amount} Added to Your Wallet</div>\n' +
    '</div>\n' +
    '<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">\n' +
    '  <table style="width: 100%; border-collapse: collapse;">\n' +
    '    <tr><td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Gift Card Code:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">#{gift_card_code}</td></tr>\n' +
    '    <tr><td style="padding: 8px 0;"><strong>New Wallet Balance:</strong></td><td style="padding: 8px 0; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{new_balance}</strong></td></tr>\n' +
    '  </table>\n' +
    '</div>\n' +
    '<p>Your credit is now available and can be applied at checkout on your next purchase.</p>\n' +
    '<p style="margin: 24px 0;"><a href="https://brakebee.com/shop" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Start Shopping</a></p>\n' +
    '<p>Best regards,<br>The Brakebee Team</p>',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'default'
};

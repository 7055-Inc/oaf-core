module.exports = {
  template_key: 'gift_card_received',
  name: 'Gift Card Received',
  subject_template: '🎁 You received a Brakebee Gift Card!',
  body_template:
    '<div style="text-align: center; margin-bottom: 24px;">\n' +
    '  <div style="font-size: 64px;">🎁</div>\n' +
    '</div>\n' +
    '<h2 style="text-align: center; margin-bottom: 8px;">You\'ve Received a Gift!</h2>\n' +
    '<p style="text-align: center; color: #6c757d; margin-bottom: 32px;">#{sender_name} sent you a Brakebee gift card</p>\n' +
    '#{personal_message_block}\n' +
    '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 16px; margin: 24px 0; text-align: center;">\n' +
    '  <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Your Gift Card Value</div>\n' +
    '  <div style="font-size: 48px; font-weight: 700; margin-bottom: 24px;">$#{amount}</div>\n' +
    '  <div style="background: rgba(255,255,255,0.2); padding: 16px; border-radius: 8px; margin-bottom: 16px;">\n' +
    '    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">YOUR CODE</div>\n' +
    '    <div style="font-size: 24px; font-weight: 600; letter-spacing: 2px; font-family: monospace;">#{gift_card_code}</div>\n' +
    '  </div>\n' +
    '  #{expiration_notice}\n' +
    '</div>\n' +
    '<div style="text-align: center; margin: 32px 0;">\n' +
    '  <a href="#{redeem_link}" style="display: inline-block; background: #28a745; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Redeem Now</a>\n' +
    '</div>\n' +
    '<p style="text-align: center; color: #6c757d; font-size: 14px;">Click the button above to automatically redeem your gift card, or enter the code manually in your account\'s "My Wallet" section.</p>\n' +
    '<hr style="border: none; border-top: 1px solid #e9ecef; margin: 32px 0;">\n' +
    '<p style="text-align: center; font-size: 14px; color: #6c757d;"><a href="#{print_link}" style="color: #667eea;">Print a Gift Card</a> to give as a physical gift</p>\n' +
    '<p style="text-align: center; font-size: 14px; color: #6c757d;">Questions? Visit our <a href="https://brakebee.com/help" style="color: #667eea;">Help Center</a></p>',
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

module.exports = {
  template_key: 'onboarding_create_tickets',
  name: 'Promoter Onboarding: Set Up Ticket Sales',
  subject_template: 'Set Up Ticket Sales for Your Event',
  body_template: '<h1>Turn Your Event Into Revenue 💰</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Maximize attendance and revenue with Brakebee\'s integrated ticketing system.</p>\n' +
    '<h2>Ticketing Features</h2>\n' +
    '<ul><li><strong>Multiple Ticket Tiers:</strong> General admission, VIP, early bird, etc.</li><li><strong>Promo Codes:</strong> Create discounts for specific groups</li><li><strong>Capacity Management:</strong> Set limits per tier</li><li><strong>Instant Payments:</strong> Get paid immediately after sales</li><li><strong>QR Code Scanning:</strong> Easy check-in at the door</li></ul>\n' +
    '<div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;"><p style="margin: 0;"><strong>Brakebee handles all payment processing - you just collect the revenue!</strong></p></div>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{tickets_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Set Up Tickets</a></div>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

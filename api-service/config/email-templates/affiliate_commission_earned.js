module.exports = {
  template_key: 'affiliate_commission_earned',
  name: 'Affiliate Commission Earned',
  subject_template: 'You earned a commission! 🎉',
  body_template: `<h2>Congratulations!</h2>
<p>Hi #{first_name},</p>
<p>Great news! You just earned an affiliate commission from a sale.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Commission Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Sale Date:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{order_date}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Your Rate:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{affiliate_rate}%</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Commission Earned:</strong></td>
      <td style="padding: 8px 0; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{commission_amount}</strong></td>
    </tr>
  </table>
</div>

<p>This commission will be eligible for payout on <strong>#{eligible_date}</strong> (30-day hold for returns).</p>

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Your Earnings</a>
</p>

<p>Keep sharing and earning!</p>

<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

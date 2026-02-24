module.exports = {
  template_key: 'affiliate_payout_processed',
  name: 'Affiliate Payout Processed',
  subject_template: 'Your affiliate payout is on the way! 💰',
  body_template: `<h2>Payout Processed!</h2>
<p>Hi #{first_name},</p>
<p>We've processed your affiliate payout.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Payout Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Amount:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{payout_amount}</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Commissions Included:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{commission_count}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Method:</strong></td>
      <td style="padding: 8px 0; text-align: right;">#{payout_method}</td>
    </tr>
  </table>
</div>

#{stripe_message}
#{credit_message}

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Payout History</a>
</p>

<p>Thank you for being a valued affiliate partner!</p>

<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

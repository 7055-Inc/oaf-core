module.exports = {
  template_key: 'affiliate_commission_cancelled',
  name: 'Affiliate Commission Cancelled',
  subject_template: 'Commission update for your account',
  body_template: `<h2>Commission Update</h2>
<p>Hi #{first_name},</p>
<p>A commission you earned has been cancelled because the associated order was refunded.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
  <h3 style="margin-top: 0; color: #856404;">Cancelled Commission Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #ffe69c;"><strong>Original Commission:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #ffe69c; text-align: right;">$#{commission_amount}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Reason:</strong></td>
      <td style="padding: 8px 0; text-align: right;">#{cancellation_reason}</td>
    </tr>
  </table>
</div>

<p>This doesn't affect any other commissions you've earned. Your remaining balance and pending commissions are unaffected.</p>

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Your Dashboard</a>
</p>

<p>If you have any questions, please contact support.</p>

<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

module.exports = {
  template_key: 'booth_fee_overdue',
  name: 'Booth Fee Overdue Notice',
  subject_template: 'OVERDUE: Booth fee payment for #{event_title}',
  body_template: `<h2>🚨 OVERDUE NOTICE</h2>
<p>Dear #{artist_name},</p>
<p>Your booth fee payment for #{event_title} is now <strong>OVERDUE</strong>.</p>
<h3>Payment Details:</h3>
<ul>
<li><strong>Amount Due:</strong> #{booth_fee_amount}</li>
<li><strong>Original Due Date:</strong> #{due_date}</li>
<li><strong>Days Overdue:</strong> #{days_overdue}</li>
</ul>
<h3>⚠️ Urgent Action Required:</h3>
<p>Please pay immediately to avoid losing your spot:</p>
<p><a href="#{payment_url}" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">💳 Pay Now</a></p>
<p><strong>Important:</strong> If payment is not received within #{grace_period} days, your application may be cancelled.</p>
<p>If you have any questions, please contact us immediately at #{contact_email}.</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

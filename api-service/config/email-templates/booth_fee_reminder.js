module.exports = {
  template_key: 'booth_fee_reminder',
  name: 'Booth Fee Reminder',
  subject_template: 'Reminder: Booth fee payment due for #{event_title}',
  body_template: `<h2>⏰ Payment Reminder</h2>
<p>Dear #{artist_name},</p>
<p>This is a friendly reminder that your booth fee payment is due for #{event_title}.</p>
<h3>Payment Details:</h3>
<ul>
<li><strong>Amount Due:</strong> #{booth_fee_amount}</li>
<li><strong>Due Date:</strong> #{due_date}</li>
<li><strong>Days Remaining:</strong> #{days_remaining}</li>
</ul>
<h3>💳 Pay Now:</h3>
<p><a href="#{payment_url}" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">💳 Pay Now</a></p>
<p>Please complete your payment to secure your spot at #{event_title}.</p>
<p>If you have any questions, please contact us at #{contact_email}.</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

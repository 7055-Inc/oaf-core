module.exports = {
  template_key: 'application_fee_refunded',
  name: 'Application Fee Refunded',
  subject_template: 'Your application fee has been refunded for #{event_title}',
  body_template: `<h2>💰 Application Fee Refunded</h2>
<p>Dear #{artist_name},</p>
<p>Your application fee for <strong>#{event_title}</strong> has been refunded.</p>
<h3>Refund Details:</h3>
<ul>
<li><strong>Event:</strong> #{event_title}</li>
<li><strong>Refund Amount:</strong> #{refund_amount}</li>
<li><strong>Refund Date:</strong> #{refund_date}</li>
</ul>
<p>The refund will be credited back to your original payment method within 5-10 business days.</p>
<p>If you have any questions, please contact us at #{contact_email}.</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

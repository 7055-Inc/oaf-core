module.exports = {
  template_key: 'booth_fee_confirmation',
  name: 'Booth Fee Payment Confirmation',
  subject_template: 'Payment confirmed for #{event_title}',
  body_template: `<h2>✅ Payment Confirmed!</h2>
<p>Dear #{artist_name},</p>
<p>Thank you! Your booth fee payment has been successfully processed.</p>
<h3>Payment Details:</h3>
<ul>
<li><strong>Event:</strong> #{event_title}</li>
<li><strong>Amount Paid:</strong> #{amount_paid}</li>
<li><strong>Transaction ID:</strong> #{transaction_id}</li>
<li><strong>Payment Date:</strong> #{payment_date}</li>
</ul>
<h3>🎉 What's Next:</h3>
<ul>
<li>You will receive event preparation details closer to the event date</li>
<li>Save this confirmation for your records</li>
<li>Contact us if you have any questions</li>
</ul>
<p>We look forward to seeing you at #{event_title}!</p>
<p>Thank you for your participation!</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

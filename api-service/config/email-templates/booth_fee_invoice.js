module.exports = {
  template_key: 'booth_fee_invoice',
  name: 'Booth Fee Invoice',
  subject_template: 'Your booth fee invoice for #{event_title}',
  body_template: `<h2>🎪 Booth Fee Invoice</h2>
<p>Dear #{artist_name},</p>
<p>Congratulations! Your application has been <strong>accepted</strong> for #{event_title}.</p>
<h3>Event Details:</h3>
<ul>
<li><strong>Event:</strong> #{event_title}</li>
<li><strong>Dates:</strong> #{event_dates}</li>
<li><strong>Location:</strong> #{event_location}</li>
<li><strong>Booth Fee:</strong> #{booth_fee_amount}</li>
<li><strong>Due Date:</strong> #{due_date}</li>
</ul>
<h3>💳 Payment Information:</h3>
<p>To confirm your participation, please pay your booth fee by clicking the link below:</p>
<p><a href="#{payment_url}" style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">💳 Pay Booth Fee</a></p>
<p><strong>Payment Due:</strong> #{due_date}</p>
<p>If you have any questions, please contact us at #{contact_email}.</p>
<p>Thank you for participating in #{event_title}!</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

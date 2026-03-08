module.exports = {
  template_key: 'marketplace_application_submitted',
  name: 'Marketplace Application Submitted',
  subject_template: 'Marketplace Application Received - #{application_id}',
  body_template: `<h2>Thank you for your marketplace application!</h2>
<p>Dear #{artist_name},</p>
<p>We have received your marketplace application and it is now under review by our jury panel.</p>
<p><strong>Application Details:</strong></p>
<ul>
<li>Application ID: #{application_id}</li>
<li>Submitted: #{submission_date}</li>
<li>Status: Under Review</li>
</ul>
<p>Our jury will carefully review your work description and submitted materials. You will be notified via email once a decision has been made.</p>
<p>Thank you for your interest in joining our curated marketplace!</p>
<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

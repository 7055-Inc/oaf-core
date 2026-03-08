module.exports = {
  template_key: 'marketplace_application_denied',
  name: 'Marketplace Application Denied',
  subject_template: 'Marketplace Application Update - #{application_id}',
  body_template: `<h2>Marketplace Application Decision</h2>
<p>Dear #{artist_name},</p>
<p>Thank you for your interest in joining the Brakebee Marketplace. After careful review by our jury panel, we are unable to approve your application at this time.</p>
<p><strong>Application Details:</strong></p>
<ul>
<li>Application ID: #{application_id}</li>
<li>Reviewed: #{review_date}</li>
</ul>
<p><strong>Reason:</strong> #{denial_reason}</p>
#{admin_notes_section}
<p>We encourage you to continue developing your craft. You may reapply to the marketplace in the future as your work evolves.</p>
<p>Thank you for your understanding.</p>
<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

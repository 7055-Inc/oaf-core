module.exports = {
  template_key: 'marketplace_application_approved',
  name: 'Marketplace Application Approved',
  subject_template: 'Congratulations! Your Marketplace Application Has Been Approved 🎉',
  body_template: `<h2>Welcome to the Brakebee Marketplace!</h2>
<p>Dear #{artist_name},</p>
<p>Congratulations! Your marketplace application has been <strong>approved</strong> by our jury panel.</p>
<p><strong>Application Details:</strong></p>
<ul>
<li>Application ID: #{application_id}</li>
<li>Approved: #{approval_date}</li>
</ul>
#{admin_notes_section}
<p><strong>What happens next?</strong></p>
<ul>
<li>✅ Your marketplace permissions have been activated</li>
<li>✅ You can now list products for marketplace display</li>
<li>✅ Your products are eligible for our curated collections</li>
</ul>
<p>Visit your <a href="#{dashboard_url}">dashboard</a> to start adding products to the marketplace.</p>
<p>Welcome to the community!</p>
<p>Best regards,<br>The Brakebee Team</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

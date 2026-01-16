require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function updateMarketplaceEmails() {
  console.log('Updating marketplace application email templates...\n');

  try {
    // Update APPROVED email template
    const approvedBody = `<h2>Welcome to the Brakebee Marketplace!</h2>
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
<p>Best regards,<br>The Brakebee Team</p>`;

    await db.execute(
      `UPDATE email_templates SET body_template = ? WHERE template_key = 'marketplace_application_approved'`,
      [approvedBody]
    );
    console.log('✅ Updated marketplace_application_approved template');

    // Update DENIED email template
    const deniedBody = `<h2>Marketplace Application Decision</h2>
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
<p>Best regards,<br>The Brakebee Team</p>`;

    await db.execute(
      `UPDATE email_templates SET body_template = ? WHERE template_key = 'marketplace_application_denied'`,
      [deniedBody]
    );
    console.log('✅ Updated marketplace_application_denied template');

    console.log('\n✅ All marketplace email templates updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await db.end();
    process.exit(0);
  }
}

updateMarketplaceEmails();

module.exports = {
  template_key: 'application_submitted',
  name: 'Application Submitted Confirmation',
  subject_template: 'Application Submitted - {{event_title}}',
  body_template: `<h2>Your Application Has Been Submitted!</h2>
<p>Hi {{artist_name}},</p>
<p>Thank you for submitting your application to <strong>{{event_title}}</strong>.</p>
<p><strong>Application Details:</strong></p>
<ul>
  <li>Application ID: #{{application_id}}</li>
  <li>Amount Paid: \${{amount_paid}}</li>
</ul>
<p>Your application is now under review. You will receive an email notification when the promoter makes a decision.</p>
<p>You can check your application status anytime in your dashboard.</p>
<p>Thank you for using Brakebee!</p>`,
  is_transactional: true,
  priority_level: 1,
  layout_key: 'default'
};

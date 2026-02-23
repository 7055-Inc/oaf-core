module.exports = {
  template_key: 'promoter_event_notification_grouped',
  name: 'Promoter Event Claim Notification (Multiple Artists)',
  subject_template: '#{artist_count} artists have added your event — #{event_name}',
  body_template: `<h2>Hello #{promoter_name},</h2>

<p><strong>#{artist_count} artists</strong> have added your event <strong>#{event_name}</strong> to their calendars on Brakebee and indicated you as the organizer.</p>

<h3>Artists Requesting Claim</h3>
<p>#{artist_names}</p>

<h3>Event Details</h3>
<table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 500px;">
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Event:</strong></td><td>#{event_name}</td></tr>
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Dates:</strong></td><td>#{event_start_date} — #{event_end_date}</td></tr>
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Venue:</strong></td><td>#{venue_name}</td></tr>
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Location:</strong></td><td>#{event_location}</td></tr>
</table>

<h3>Claim This Event</h3>
<p>If this is your event, claim it to manage all these artists, accept applications, and promote your event to our community. All listed artists will be automatically added as applicants.</p>

<p style="margin: 24px 0;">
  <a href="#{claim_url}" style="background-color: #055474; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Claim Your Event</a>
</p>

<p style="font-size: 14px; color: #666;">This link expires in 30 days. If you don't recognize this event, you can safely ignore this email.</p>`,
  is_transactional: true,
  priority_level: 'high',
  layout_key: 'default'
};

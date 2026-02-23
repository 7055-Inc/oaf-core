module.exports = {
  template_key: 'artist_exhibiting_request',
  name: 'Artist Exhibiting Request',
  subject_template: '#{artist_name} wants to be verified as exhibiting at #{event_name}',
  body_template: `<h2>Hello,</h2>

<p><strong>#{artist_name}</strong> has requested to be verified as an exhibiting artist at your event <strong>#{event_name}</strong>.</p>

<h3>Event Details</h3>
<table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 500px;">
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Event:</strong></td><td>#{event_name}</td></tr>
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Date:</strong></td><td>#{event_start_date}</td></tr>
  <tr><td style="color: #666; padding: 4px 12px 4px 0;"><strong>Location:</strong></td><td>#{event_location}</td></tr>
</table>

<p>If this artist is attending your event, you can confirm them from your event management dashboard.</p>

<p style="margin: 24px 0;">
  <a href="#{manage_url}" style="background-color: #055474; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Manage Artists</a>
</p>

<p style="font-size: 14px; color: #666;">If you don't recognize this artist, you can safely ignore this request.</p>`,
  is_transactional: true,
  priority_level: 'high',
  layout_key: 'default'
};

module.exports = {
  template_key: 'artist_event_claimed_confirmation',
  name: 'Artist Event Claimed Confirmation',
  subject_template: '#{promoter_name} has #{action_type} your event on Brakebee',
  body_template: `<h1>Event #{action_type_title}</h1>

<p>Great news, #{artist_name}!</p>

<p><strong>#{promoter_name}</strong> has #{action_description} the event you suggested: <strong>#{event_name}</strong></p>

<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFA500;">
  <p style="margin: 5px 0;"><strong>What this means:</strong></p>
  <p style="margin: 5px 0;">#{action_explanation}</p>
</div>

<div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Event Details:</h3>
  <p style="margin: 5px 0;"><strong>Event Name:</strong> #{event_name}</p>
  <p style="margin: 5px 0;"><strong>Dates:</strong> #{event_start_date} - #{event_end_date}</p>
  <p style="margin: 5px 0;"><strong>Location:</strong> #{event_location}</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="#{event_url}" style="display: inline-block; padding: 15px 30px; background: #FFA500; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
    View Official Event Page
  </a>
</div>

<p>You can now see this official event on your calendar, and it will display the promoter's complete event information.</p>

<p style="font-size: 14px; color: #666; margin-top: 30px;">Thank you for helping us build a better event community on Brakebee!</p>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};

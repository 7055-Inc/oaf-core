module.exports = {
  template_key: 'contact_form_notification',
  name: 'Contact Form Notification',
  subject_template: 'New Contact Form Message from #{sender_name}',
  body_template: '<p>You have received a new message through your website contact form.</p><p><strong>From:</strong> #{sender_name} (#{sender_email})<br><strong>Phone:</strong> #{sender_phone}<br><strong>Submitted:</strong> #{timestamp}</p><p><strong>Message:</strong><br>#{message}</p><p>Reply directly to this email to respond to #{sender_name}.</p><p><a href="#{site_url}">Visit your website</a></p>',
  is_transactional: true,
  priority_level: 3,
  layout_key: 'artist_site'
};

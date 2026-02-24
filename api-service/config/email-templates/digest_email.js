module.exports = {
  template_key: 'digest_email',
  name: 'Email Digest',
  subject_template: 'Your #{frequency} Email Digest',
  body_template: 'Here is your compiled email digest...',
  is_transactional: false,
  priority_level: 5,
  layout_key: 'default'
};

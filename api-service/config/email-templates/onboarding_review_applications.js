module.exports = {
  template_key: 'onboarding_review_applications',
  name: 'Promoter Onboarding: Tips for Reviewing Applications',
  subject_template: 'Tips for Reviewing Artist Applications',
  body_template: '<h1>Master the Art of Jurying 🎯</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Reviewing applications can be overwhelming. Here are our best practices for building the perfect artist lineup:</p>\n' +
    '<h2>Jurying Best Practices</h2>\n' +
    '<ul><li><strong>Set Clear Criteria:</strong> Define what makes an artist a good fit</li><li><strong>Category Balance:</strong> Ensure variety across art mediums</li><li><strong>Quality Over Quantity:</strong> Better to have fewer excellent artists</li><li><strong>Review Portfolios:</strong> Look at past work, not just current submissions</li><li><strong>Consider Experience:</strong> Mix of established and emerging artists</li></ul>\n' +
    '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;"><p style="margin: 0;"><strong>Pro Tip:</strong> Use the bulk actions feature to process applications faster!</p></div>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{applications_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Review Applications</a></div>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

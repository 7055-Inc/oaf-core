module.exports = {
  template_key: 'onboarding_marketing_materials',
  name: 'Promoter Onboarding: Marketing Materials',
  subject_template: 'Boost Your Event With Marketing Materials',
  body_template: '<h1>Amplify Your Event\'s Reach 📣</h1>\n' +
    '<p>Hi #{promoter_name},</p>\n' +
    '<p>Want to increase attendance and artist applications? Professional marketing materials make all the difference.</p>\n' +
    '<h2>Available Marketing Tools</h2>\n' +
    '<ul><li><strong>Social Media Graphics:</strong> Ready-to-post designs</li><li><strong>Email Templates:</strong> Reach your mailing list</li><li><strong>Printable Posters:</strong> For local promotion</li><li><strong>Digital Ads:</strong> Facebook and Instagram ready</li><li><strong>Press Release Template:</strong> Get local media coverage</li></ul>\n' +
    '<div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;"><p style="margin: 0;"><strong>New:</strong> Customizable marketing kits with your event branding!</p></div>\n' +
    '<div style="text-align: center; margin: 30px 0;"><a href="#{marketing_url}" style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Order Marketing Materials</a></div>\n' +
    '<p>Best,<br><strong>The Brakebee Team</strong></p>',
  is_transactional: false,
  priority_level: 2,
  layout_key: 'default'
};

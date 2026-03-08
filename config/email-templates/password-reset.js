/**
 * Password Reset Email Template
 * System default for password reset requests
 */

module.exports = {
  template_key: 'password-reset',
  name: 'Password Reset',
  subject_template: 'Reset Your Password - #{siteName}',
  is_transactional: true,
  priority_level: 5,
  layout_key: 'default',
  
  // Editor.js blocks format
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Reset Your Password',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Hi #{firstName},'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'We received a request to reset your password for your #{siteName} account. Click the button below to create a new password:'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Reset Password</a>'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'This link will expire in 24 hours for security reasons.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If you didn\'t request this password reset, you can safely ignore this email. Your password will not be changed.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'For security, here\'s the direct link if the button doesn\'t work:<br>#{resetLink}'
        }
      }
    ]
  },
  
  // Available variables for this template
  variables: ['firstName', 'siteName', 'resetLink']
};

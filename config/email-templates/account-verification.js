/**
 * Account Verification Email Template
 * System default for email verification
 */

module.exports = {
  template_key: 'account-verification',
  name: 'Account Verification',
  subject_template: 'Verify Your Email Address - #{siteName}',
  is_transactional: true,
  priority_level: 5,
  layout_key: 'default',
  
  body_template: {
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Verify Your Email Address',
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
          text: 'Welcome to #{siteName}! To complete your registration, please verify your email address by clicking the button below:'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '<a href="#{verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">Verify Email Address</a>'
        }
      },
      {
        type: 'warning',
        data: {
          title: 'Security Notice',
          message: 'This link will expire in 24 hours. If you didn\'t create an account, you can safely ignore this email.'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'If the button doesn\'t work, copy and paste this link into your browser:'
        }
      },
      {
        type: 'paragraph',
        data: {
          text: '#{verificationLink}'
        }
      }
    ]
  },
  
  variables: ['firstName', 'siteName', 'verificationLink']
};

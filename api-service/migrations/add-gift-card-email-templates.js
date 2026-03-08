/**
 * Migration: Add Gift Card Email Templates
 * 
 * Creates email templates for the gift card system:
 * 1. gift_card_received - Sent to recipient with gift card code
 * 2. gift_card_sent_confirmation - Sent to sender confirming the gift card was issued
 * 3. gift_card_redeemed - Sent to recipient confirming redemption
 * 
 * Run: node api-service/migrations/add-gift-card-email-templates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

const templates = [
  {
    template_key: 'gift_card_received',
    name: 'Gift Card Received',
    priority_level: 2,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: '🎁 You received a Brakebee Gift Card!',
    body_template: `<div style="text-align: center; margin-bottom: 24px;">
  <div style="font-size: 64px;">🎁</div>
</div>

<h2 style="text-align: center; margin-bottom: 8px;">You've Received a Gift!</h2>
<p style="text-align: center; color: #6c757d; margin-bottom: 32px;">#{sender_name} sent you a Brakebee gift card</p>

#{personal_message_block}

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 16px; margin: 24px 0; text-align: center;">
  <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Your Gift Card Value</div>
  <div style="font-size: 48px; font-weight: 700; margin-bottom: 24px;">$#{amount}</div>
  
  <div style="background: rgba(255,255,255,0.2); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">YOUR CODE</div>
    <div style="font-size: 24px; font-weight: 600; letter-spacing: 2px; font-family: monospace;">#{gift_card_code}</div>
  </div>
  
  #{expiration_notice}
</div>

<div style="text-align: center; margin: 32px 0;">
  <a href="#{redeem_link}" style="display: inline-block; background: #28a745; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Redeem Now</a>
</div>

<p style="text-align: center; color: #6c757d; font-size: 14px;">
  Click the button above to automatically redeem your gift card, or enter the code manually in your account's "My Wallet" section.
</p>

<hr style="border: none; border-top: 1px solid #e9ecef; margin: 32px 0;">

<p style="text-align: center; font-size: 14px; color: #6c757d;">
  <a href="#{print_link}" style="color: #667eea;">Print a Gift Card</a> to give as a physical gift
</p>

<p style="text-align: center; font-size: 14px; color: #6c757d;">
  Questions? Visit our <a href="https://brakebee.com/help" style="color: #667eea;">Help Center</a>
</p>`
  },
  {
    template_key: 'gift_card_sent_confirmation',
    name: 'Gift Card Sent Confirmation',
    priority_level: 3,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: 'Your Brakebee gift card has been sent! ✨',
    body_template: `<h2>Gift Card Sent Successfully!</h2>
<p>Hi #{sender_name},</p>
<p>Your Brakebee gift card has been sent to <strong>#{recipient_email}</strong>.</p>

<div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0;">
  <h3 style="margin-top: 0;">Gift Card Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Recipient:</strong></td>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{recipient_name}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Amount:</strong></td>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{amount}</strong></td>
    </tr>
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Code:</strong></td>
      <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">#{gift_card_code}</td>
    </tr>
    #{expiration_row}
  </table>
</div>

#{personal_message_block}

<p style="margin: 24px 0;">
  <a href="#{print_link}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Print Gift Card</a>
</p>

<p style="color: #6c757d; font-size: 14px;">The recipient will receive an email with their gift card code and instructions to redeem it.</p>

<p>Thank you for sharing the gift of handmade art!</p>

<p>Best regards,<br>The Brakebee Team</p>`
  },
  {
    template_key: 'gift_card_redeemed',
    name: 'Gift Card Redeemed',
    priority_level: 3,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: '✅ Gift card redeemed successfully!',
    body_template: `<h2>Gift Card Redeemed!</h2>
<p>Hi #{first_name},</p>
<p>You've successfully redeemed your gift card.</p>

<div style="background: #d4edda; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
  <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
  <div style="font-size: 24px; font-weight: 600; color: #155724;">$#{amount} Added to Your Wallet</div>
</div>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Gift Card Code:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">#{gift_card_code}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>New Wallet Balance:</strong></td>
      <td style="padding: 8px 0; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{new_balance}</strong></td>
    </tr>
  </table>
</div>

<p>Your credit is now available and can be applied at checkout on your next purchase.</p>

<p style="margin: 24px 0;">
  <a href="https://brakebee.com/shop" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Start Shopping</a>
</p>

<p>Best regards,<br>The Brakebee Team</p>`
  }
];

async function migrate() {
  console.log('Adding gift card email templates...\n');
  
  try {
    for (const template of templates) {
      // Check if template already exists
      const [existing] = await db.execute(
        'SELECT id FROM email_templates WHERE template_key = ?',
        [template.template_key]
      );
      
      if (existing.length > 0) {
        console.log(`⚠️  Template '${template.template_key}' already exists (ID: ${existing[0].id}). Skipping...`);
        continue;
      }
      
      // Insert new template
      const [result] = await db.execute(
        `INSERT INTO email_templates 
         (template_key, name, priority_level, can_compile, is_transactional, layout_key, subject_template, body_template) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          template.template_key,
          template.name,
          template.priority_level,
          template.can_compile,
          template.is_transactional,
          template.layout_key,
          template.subject_template,
          template.body_template
        ]
      );
      
      console.log(`✅ Created template: ${template.template_key} (ID: ${result.insertId})`);
    }
    
    console.log('\n✅ Gift card email templates migration complete!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

migrate();

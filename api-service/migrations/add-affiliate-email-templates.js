/**
 * Migration: Add Affiliate Email Templates
 * 
 * Creates the three email templates needed for the affiliate system:
 * 1. affiliate_commission_earned - Sent when an affiliate earns a commission
 * 2. affiliate_payout_processed - Sent when a payout is completed
 * 3. affiliate_commission_cancelled - Sent when a commission is cancelled due to refund
 * 
 * Run: node api-service/migrations/add-affiliate-email-templates.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

const templates = [
  {
    template_key: 'affiliate_commission_earned',
    name: 'Affiliate Commission Earned',
    priority_level: 2,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: 'You earned a commission! 🎉',
    body_template: `<h2>Congratulations!</h2>
<p>Hi #{first_name},</p>
<p>Great news! You just earned an affiliate commission from a sale.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Commission Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Sale Date:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{order_date}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Your Rate:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{affiliate_rate}%</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Commission Earned:</strong></td>
      <td style="padding: 8px 0; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{commission_amount}</strong></td>
    </tr>
  </table>
</div>

<p>This commission will be eligible for payout on <strong>#{eligible_date}</strong> (30-day hold for returns).</p>

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Your Earnings</a>
</p>

<p>Keep sharing and earning!</p>

<p>Best regards,<br>The Brakebee Team</p>`
  },
  {
    template_key: 'affiliate_payout_processed',
    name: 'Affiliate Payout Processed',
    priority_level: 2,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: 'Your affiliate payout is on the way! 💰',
    body_template: `<h2>Payout Processed!</h2>
<p>Hi #{first_name},</p>
<p>We've processed your affiliate payout.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Payout Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Amount:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 1.2em; color: #28a745;"><strong>$#{payout_amount}</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><strong>Commissions Included:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">#{commission_count}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Method:</strong></td>
      <td style="padding: 8px 0; text-align: right;">#{payout_method}</td>
    </tr>
  </table>
</div>

#{stripe_message}
#{credit_message}

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Payout History</a>
</p>

<p>Thank you for being a valued affiliate partner!</p>

<p>Best regards,<br>The Brakebee Team</p>`
  },
  {
    template_key: 'affiliate_commission_cancelled',
    name: 'Affiliate Commission Cancelled',
    priority_level: 2,
    can_compile: 1,
    is_transactional: 1,
    layout_key: 'default',
    subject_template: 'Commission update for your account',
    body_template: `<h2>Commission Update</h2>
<p>Hi #{first_name},</p>
<p>A commission you earned has been cancelled because the associated order was refunded.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
  <h3 style="margin-top: 0; color: #856404;">Cancelled Commission Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #ffe69c;"><strong>Original Commission:</strong></td>
      <td style="padding: 8px 0; border-bottom: 1px solid #ffe69c; text-align: right;">$#{commission_amount}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0;"><strong>Reason:</strong></td>
      <td style="padding: 8px 0; text-align: right;">#{cancellation_reason}</td>
    </tr>
  </table>
</div>

<p>This doesn't affect any other commissions you've earned. Your remaining balance and pending commissions are unaffected.</p>

<p style="margin: 20px 0;">
  <a href="#{dashboard_link}" style="display: inline-block; background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Your Dashboard</a>
</p>

<p>If you have any questions, please contact support.</p>

<p>Best regards,<br>The Brakebee Team</p>`
  }
];

async function migrate() {
  console.log('Adding affiliate email templates...\n');
  
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
    
    console.log('\n✅ Affiliate email templates migration complete!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

migrate();

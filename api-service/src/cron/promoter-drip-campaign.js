const db = require('../../config/db');
const EmailService = require('../services/emailService');
const { checkFeature } = require('../lib/featureChecks');

/**
 * @fileoverview Promoter Drip Campaign Processor
 * 
 * Daily cron job to process onboarding email sequences
 * Runs once per day to check if users need next email in sequence
 */

const emailService = new EmailService();

/**
 * Main processor function
 * Finds users in active campaigns and sends next email if conditions are met
 */
async function processDripCampaign() {
  console.log('[Drip Campaign] Starting daily process...');
  
  const startTime = Date.now();
  let emailsSent = 0;
  let emailsSkipped = 0;
  let errors = 0;

  try {
    // Get all active campaign enrollments
    const [enrollments] = await db.execute(`
      SELECT 
        uce.id as enrollment_id,
        uce.user_id,
        uce.campaign_id,
        uce.current_step,
        uce.enrolled_at,
        u.username as email,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        up.first_name,
        e.id as event_id,
        e.title as event_title
      FROM user_campaign_enrollments uce
      JOIN onboarding_campaigns oc ON uce.campaign_id = oc.id
      JOIN users u ON uce.user_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN events e ON e.promoter_id = u.id AND e.claim_status = 'claimed'
      WHERE uce.completed_at IS NULL
        AND uce.paused_at IS NULL
        AND oc.is_active = 1
        AND u.status = 'active'
      ORDER BY uce.enrolled_at ASC
    `);

    console.log(`[Drip Campaign] Processing ${enrollments.length} active enrollments`);

    for (const enrollment of enrollments) {
      try {
        await processEnrollment(enrollment);
        emailsSent++;
      } catch (error) {
        console.error(`[Drip Campaign] Error processing enrollment ${enrollment.enrollment_id}:`, error);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Drip Campaign] Completed in ${duration}s`);
    console.log(`[Drip Campaign] Stats: ${emailsSent} sent, ${emailsSkipped} skipped, ${errors} errors`);

    return {
      success: true,
      emailsSent,
      emailsSkipped,
      errors,
      duration
    };

  } catch (error) {
    console.error('[Drip Campaign] Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process a single enrollment
 * @param {Object} enrollment - Enrollment record
 */
async function processEnrollment(enrollment) {
  // Calculate days since enrollment
  const enrolledDate = new Date(enrollment.enrolled_at);
  const now = new Date();
  const daysSinceEnrollment = Math.floor((now - enrolledDate) / (1000 * 60 * 60 * 24));

  // Get next email in sequence
  const [templates] = await db.execute(`
    SELECT 
      id,
      sequence_order,
      days_after_claim,
      subject,
      template_key,
      feature_check_function,
      feature_check_params,
      cta_url
    FROM onboarding_email_templates
    WHERE campaign_id = ? 
      AND sequence_order > ?
      AND is_active = 1
      AND days_after_claim <= ?
    ORDER BY sequence_order ASC
    LIMIT 1
  `, [enrollment.campaign_id, enrollment.current_step, daysSinceEnrollment]);

  if (templates.length === 0) {
    // No more emails to send - mark campaign as completed
    if (enrollment.current_step > 0) {
      await db.execute(`
        UPDATE user_campaign_enrollments
        SET completed_at = NOW()
        WHERE id = ?
      `, [enrollment.enrollment_id]);
      console.log(`[Drip Campaign] Campaign completed for user ${enrollment.user_id}`);
    }
    return;
  }

  const template = templates[0];

  // Check if email was already sent
  const [alreadySent] = await db.execute(`
    SELECT id FROM user_campaign_emails
    WHERE user_id = ? AND template_id = ?
  `, [enrollment.user_id, template.id]);

  if (alreadySent.length > 0) {
    console.log(`[Drip Campaign] Email ${template.template_key} already sent to user ${enrollment.user_id}`);
    // Update current step anyway
    await db.execute(`
      UPDATE user_campaign_enrollments
      SET current_step = ?
      WHERE id = ?
    `, [template.sequence_order, enrollment.enrollment_id]);
    return;
  }

  // Feature check - should we skip this email?
  if (template.feature_check_function) {
    try {
      const featureCompleted = await checkFeature(
        template.feature_check_function,
        enrollment.user_id,
        template.feature_check_params ? JSON.parse(template.feature_check_params) : {}
      );

      if (featureCompleted) {
        console.log(`[Drip Campaign] Skipping ${template.template_key} for user ${enrollment.user_id} - feature already completed`);
        
        // Log the skip
        await db.execute(`
          INSERT INTO user_campaign_emails (
            user_id, enrollment_id, template_id, sent_at, skipped, skip_reason
          ) VALUES (?, ?, ?, NOW(), 1, ?)
        `, [
          enrollment.user_id, 
          enrollment.enrollment_id, 
          template.id, 
          `Feature ${template.feature_check_function} already completed`
        ]);

        // Update current step
        await db.execute(`
          UPDATE user_campaign_enrollments
          SET current_step = ?
          WHERE id = ?
        `, [template.sequence_order, enrollment.enrollment_id]);

        return; // Skip this email
      }
    } catch (featureError) {
      console.error(`[Drip Campaign] Feature check error:`, featureError);
      // Continue to send email if feature check fails
    }
  }

  // Prepare template data
  const templateData = {
    promoter_name: enrollment.full_name,
    promoter_first_name: enrollment.first_name,
    event_title: enrollment.event_title || 'Your Event',
    event_id: enrollment.event_id,
    event_edit_url: enrollment.event_id ? 
      `${process.env.FRONTEND_URL}/events/${enrollment.event_id}/edit` : 
      `${process.env.FRONTEND_URL}/dashboard`,
    photos_url: enrollment.event_id ? 
      `${process.env.FRONTEND_URL}/events/${enrollment.event_id}/photos` : 
      `${process.env.FRONTEND_URL}/dashboard`,
    event_settings_url: enrollment.event_id ? 
      `${process.env.FRONTEND_URL}/events/${enrollment.event_id}/edit` : 
      `${process.env.FRONTEND_URL}/dashboard`,
    tickets_url: enrollment.event_id ? 
      `${process.env.FRONTEND_URL}/events/${enrollment.event_id}/tickets` : 
      `${process.env.FRONTEND_URL}/dashboard`,
    applications_url: `${process.env.FRONTEND_URL}/dashboard/applications`,
    marketing_url: `${process.env.FRONTEND_URL}/marketing-materials`,
    dashboard_url: `${process.env.FRONTEND_URL}/dashboard`,
    help_url: `${process.env.FRONTEND_URL}/help/promoter-guide`
  };

  // Send email
  try {
    await emailService.sendEmail(
      enrollment.user_id,
      template.template_key,
      templateData
    );

    // Log the send
    await db.execute(`
      INSERT INTO user_campaign_emails (
        user_id, enrollment_id, template_id, sent_at, skipped
      ) VALUES (?, ?, ?, NOW(), 0)
    `, [enrollment.user_id, enrollment.enrollment_id, template.id]);

    // Update current step
    await db.execute(`
      UPDATE user_campaign_enrollments
      SET current_step = ?
      WHERE id = ?
    `, [template.sequence_order, enrollment.enrollment_id]);

    console.log(`[Drip Campaign] Sent ${template.template_key} to user ${enrollment.user_id}`);

  } catch (emailError) {
    console.error(`[Drip Campaign] Failed to send ${template.template_key} to user ${enrollment.user_id}:`, emailError);
    throw emailError;
  }
}

// Run if called directly (for testing)
if (require.main === module) {
  console.log('Running promoter drip campaign processor...');
  processDripCampaign()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { processDripCampaign };


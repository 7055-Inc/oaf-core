#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const EmailService = require('../src/services/emailService');

async function processEmailQueue() {
  try {
    // Get pending emails
      const [emails] = await db.execute(`
        SELECT 
          eq.*,
          et.name as template_name,
          et.template_key,
          u.username,
          uep.frequency,
          uep.is_enabled as notifications_enabled
        FROM email_queue eq
        JOIN email_templates et ON eq.template_id = et.id
        JOIN users u ON eq.user_id = u.id
        LEFT JOIN user_email_preferences uep ON u.id = uep.user_id
        WHERE eq.status = 'pending'
          AND eq.scheduled_for <= NOW()
        AND eq.attempts < 3
        ORDER BY eq.priority ASC, eq.scheduled_for ASC
      LIMIT 50
    `);

    if (emails.length === 0) {
      return;
    }

    const emailService = new EmailService();
    
    for (const email of emails) {
    try {
        // Check if user has notifications enabled
      if (!email.notifications_enabled) {
          await db.execute(`
            UPDATE email_queue 
            SET status = 'skipped', 
                error_message = 'User has disabled notifications'
            WHERE id = ?
          `, [email.id]);
          continue;
        }

        // Check frequency limits
      const frequency = email.frequency || 'weekly';
      
        if (frequency !== 'live') {
      let timeWindow;
      switch (frequency) {
        case 'hourly':
          timeWindow = 'INTERVAL 1 HOUR';
          break;
        case 'daily':
          timeWindow = 'INTERVAL 1 DAY';
          break;
        case 'weekly':
          timeWindow = 'INTERVAL 1 WEEK';
          break;
        default:
          timeWindow = 'INTERVAL 1 WEEK';
      }

      const [recentEmails] = await db.execute(`
        SELECT COUNT(*) as count
        FROM email_log
        WHERE user_id = ?
          AND status = 'sent'
          AND sent_at >= DATE_SUB(NOW(), ${timeWindow})
      `, [email.user_id]);

          if (recentEmails[0].count > 0) {
            // Reschedule email
      let rescheduleTime;
      switch (frequency) {
        case 'hourly':
          rescheduleTime = 'DATE_ADD(NOW(), INTERVAL 1 HOUR)';
          break;
        case 'daily':
          rescheduleTime = 'DATE_ADD(NOW(), INTERVAL 1 DAY)';
          break;
        case 'weekly':
          rescheduleTime = 'DATE_ADD(NOW(), INTERVAL 1 WEEK)';
          break;
        default:
          rescheduleTime = 'DATE_ADD(NOW(), INTERVAL 1 WEEK)';
      }

      await db.execute(`
        UPDATE email_queue 
              SET scheduled_for = ${rescheduleTime}
        WHERE id = ?
      `, [email.id]);
            continue;
          }
        }

        // Process the email
        let templateData;
        if (typeof email.data === 'string') {
          templateData = JSON.parse(email.data || '{}');
      } else {
          templateData = email.data || {};
        }
        
        const result = await emailService.sendEmail(
          email.user_id,
          email.template_key,
          templateData,
          email.id
        );

        if (result.success) {
          await db.execute(`
            UPDATE email_queue 
            SET status = 'sent'
            WHERE id = ?
          `, [email.id]);
        } else {
          // Handle failure
          const newAttempts = email.attempts + 1;
          
          if (newAttempts >= 3) {
            await db.execute(`
              UPDATE email_queue 
              SET status = 'failed', 
                  error_message = ?,
                  attempts = ?
              WHERE id = ?
            `, [result.error, newAttempts, email.id]);
          } else {
            const delayMinutes = Math.pow(2, newAttempts) * 5;
        await db.execute(`
          UPDATE email_queue 
          SET attempts = ?,
              scheduled_for = DATE_ADD(NOW(), INTERVAL ? MINUTE),
                  error_message = ?
          WHERE id = ?
            `, [newAttempts, delayMinutes, result.error, email.id]);
          }
      }
    } catch (err) {
        // Handle email processing error
        const newAttempts = email.attempts + 1;
        
        if (newAttempts >= 3) {
      await db.execute(`
        UPDATE email_queue 
            SET status = 'failed', 
            error_message = ?,
                attempts = ?
            WHERE id = ?
          `, [err.message, newAttempts, email.id]);
        } else {
          const delayMinutes = Math.pow(2, newAttempts) * 5;
          await db.execute(`
            UPDATE email_queue 
            SET attempts = ?,
                scheduled_for = DATE_ADD(NOW(), INTERVAL ? MINUTE),
                error_message = ?
        WHERE id = ?
          `, [newAttempts, delayMinutes, err.message, email.id]);
    }
  }
}
    
    // Cleanup old items
    await db.execute(`
      DELETE FROM email_queue 
      WHERE status IN ('sent', 'failed', 'skipped')
        AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

  } catch (err) {
    console.error('Error processing email queue:', err.message);
    process.exit(1);
  }
}

// Run the function
processEmailQueue().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
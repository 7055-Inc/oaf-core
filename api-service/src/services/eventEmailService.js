const EmailService = require('./emailService');
const db = require('../../config/db');

class EventEmailService extends EmailService {
  constructor() {
    super();
  }

  /**
   * Send booth fee invoice email when application is accepted
   */
  async sendBoothFeeInvoice(applicationId) {
    try {
      // Get application and event details
      const [applicationData] = await db.execute(`
        SELECT 
          ea.id,
          ea.artist_id,
          ea.booth_fee_amount,
          ea.booth_fee_due_date,
          ea.due_date_timezone,
          e.title as event_title,
          e.start_date,
          e.end_date,
          e.venue_name,
          e.venue_city,
          e.venue_state,
          u.first_name,
          u.last_name,
          u.email,
          ebf.payment_intent_id
        FROM event_applications ea
        JOIN events e ON ea.event_id = e.id
        JOIN users u ON ea.artist_id = u.id
        LEFT JOIN event_booth_fees ebf ON ea.id = ebf.application_id
        WHERE ea.id = ?
      `, [applicationId]);

      if (applicationData.length === 0) {
        throw new Error('Application not found');
      }

      const app = applicationData[0];
      
      // Format dates and location
      const eventDates = this.formatDateRange(app.start_date, app.end_date);
      const eventLocation = `${app.venue_name}, ${app.venue_city}, ${app.venue_state}`;
      const dueDate = this.formatDate(app.booth_fee_due_date);
      const boothFeeAmount = this.formatCurrency(app.booth_fee_amount);

      // Build payment URL
      const paymentUrl = `https://onlineartfestival.com/event-payment/${app.payment_intent_id}`;

      // Prepare template data
      const templateData = {
        artist_name: `${app.first_name} ${app.last_name}`,
        event_title: app.event_title,
        event_dates: eventDates,
        event_location: eventLocation,
        booth_fee_amount: boothFeeAmount,
        due_date: dueDate,
        payment_url: paymentUrl,
        contact_email: 'support@onlineartfestival.com'
      };

      // Send email
      const result = await this.sendEmail(app.artist_id, 'booth_fee_invoice', templateData);
      
      // Log the email send in application history
      await this.logApplicationEmail(applicationId, 'booth_fee_invoice', result.success);

      return result;

    } catch (error) {
      console.error('Error sending booth fee invoice:', error);
      throw error;
    }
  }

  /**
   * Send booth fee reminder email
   */
  async sendBoothFeeReminder(applicationId, reminderType = 'standard') {
    try {
      // Get application and event details
      const [applicationData] = await db.execute(`
        SELECT 
          ea.id,
          ea.artist_id,
          ea.booth_fee_amount,
          ea.booth_fee_due_date,
          ea.booth_fee_paid,
          e.title as event_title,
          u.first_name,
          u.last_name,
          u.email,
          ebf.payment_intent_id
        FROM event_applications ea
        JOIN events e ON ea.event_id = e.id
        JOIN users u ON ea.artist_id = u.id
        LEFT JOIN event_booth_fees ebf ON ea.id = ebf.application_id
        WHERE ea.id = ? AND ea.booth_fee_paid = 0
      `, [applicationId]);

      if (applicationData.length === 0) {
        return { success: false, reason: 'Application not found or already paid' };
      }

      const app = applicationData[0];
      
      // Calculate days remaining/overdue
      const dueDate = new Date(app.booth_fee_due_date);
      const now = new Date();
      const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Determine template and prepare data
      let templateKey = 'booth_fee_reminder';
      let templateData = {
        artist_name: `${app.first_name} ${app.last_name}`,
        event_title: app.event_title,
        booth_fee_amount: this.formatCurrency(app.booth_fee_amount),
        due_date: this.formatDate(app.booth_fee_due_date),
        payment_url: `https://onlineartfestival.com/event-payment/${app.payment_intent_id}`,
        contact_email: 'support@onlineartfestival.com'
      };

      if (daysDiff < 0) {
        // Payment is overdue
        templateKey = 'booth_fee_overdue';
        templateData.days_overdue = Math.abs(daysDiff);
        templateData.grace_period = '7';
      } else {
        // Payment is still due
        templateData.days_remaining = daysDiff;
      }

      // Send email
      const result = await this.sendEmail(app.artist_id, templateKey, templateData);
      
      // Log the email send
      await this.logApplicationEmail(applicationId, templateKey, result.success);

      return result;

    } catch (error) {
      console.error('Error sending booth fee reminder:', error);
      throw error;
    }
  }

  /**
   * Send booth fee payment confirmation email
   */
  async sendBoothFeeConfirmation(applicationId, paymentIntentId) {
    try {
      // Get application and payment details
      const [applicationData] = await db.execute(`
        SELECT 
          ea.id,
          ea.artist_id,
          ea.booth_fee_amount,
          e.title as event_title,
          u.first_name,
          u.last_name,
          u.email,
          ebp.amount_paid,
          ebp.stripe_payment_intent_id,
          ebp.payment_date
        FROM event_applications ea
        JOIN events e ON ea.event_id = e.id
        JOIN users u ON ea.artist_id = u.id
        LEFT JOIN event_booth_payments ebp ON ea.id = ebp.application_id
        WHERE ea.id = ? AND ebp.stripe_payment_intent_id = ?
      `, [applicationId, paymentIntentId]);

      if (applicationData.length === 0) {
        throw new Error('Application or payment not found');
      }

      const app = applicationData[0];
      
      // Prepare template data
      const templateData = {
        artist_name: `${app.first_name} ${app.last_name}`,
        event_title: app.event_title,
        amount_paid: this.formatCurrency(app.amount_paid || app.booth_fee_amount),
        transaction_id: app.stripe_payment_intent_id,
        payment_date: this.formatDate(app.payment_date || new Date()),
        contact_email: 'support@onlineartfestival.com'
      };

      // Send email
      const result = await this.sendEmail(app.artist_id, 'booth_fee_confirmation', templateData);
      
      // Log the email send
      await this.logApplicationEmail(applicationId, 'booth_fee_confirmation', result.success);

      return result;

    } catch (error) {
      console.error('Error sending booth fee confirmation:', error);
      throw error;
    }
  }

  /**
   * Send bulk reminder emails for an event
   */
  async sendBulkReminders(eventId, applicationIds = [], reminderType = 'standard') {
    try {
      let applications = [];
      
      if (applicationIds.length > 0) {
        // Send to specific applications
        const [appData] = await db.execute(`
          SELECT id FROM event_applications 
          WHERE id IN (${applicationIds.map(() => '?').join(',')}) 
          AND booth_fee_paid = 0
        `, applicationIds);
        applications = appData;
      } else {
        // Send to all unpaid applications for the event
        const [appData] = await db.execute(`
          SELECT id FROM event_applications 
          WHERE event_id = ? AND booth_fee_paid = 0
        `, [eventId]);
        applications = appData;
      }

      const results = [];
      for (const app of applications) {
        try {
          const result = await this.sendBoothFeeReminder(app.id, reminderType);
          results.push({ applicationId: app.id, success: result.success });
        } catch (error) {
          console.error(`Failed to send reminder for application ${app.id}:`, error);
          results.push({ applicationId: app.id, success: false, error: error.message });
        }
      }

      return {
        success: true,
        total: applications.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };

    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      throw error;
    }
  }

  /**
   * Process automated reminders (for cron job)
   */
  async processAutomatedReminders() {
    try {
      const results = {
        due_soon: [],
        overdue: [],
        final_notice: []
      };

      // Get applications due in 3 days (due soon reminders)
      const [dueSoonApps] = await db.execute(`
        SELECT ea.id, ea.booth_fee_due_date
        FROM event_applications ea
        WHERE ea.booth_fee_paid = 0
          AND DATE(ea.booth_fee_due_date) = DATE(DATE_ADD(NOW(), INTERVAL 3 DAY))
          AND ea.reminder_sent_due_soon = 0
      `);

      for (const app of dueSoonApps) {
        try {
          const result = await this.sendBoothFeeReminder(app.id, 'due_soon');
          if (result.success) {
            await db.execute(
              'UPDATE event_applications SET reminder_sent_due_soon = 1 WHERE id = ?',
              [app.id]
            );
          }
          results.due_soon.push({ applicationId: app.id, success: result.success });
        } catch (error) {
          console.error(`Failed to send due soon reminder for application ${app.id}:`, error);
          results.due_soon.push({ applicationId: app.id, success: false, error: error.message });
        }
      }

      // Get applications overdue by 1 day (overdue reminders)
      const [overdueApps] = await db.execute(`
        SELECT ea.id, ea.booth_fee_due_date
        FROM event_applications ea
        WHERE ea.booth_fee_paid = 0
          AND DATE(ea.booth_fee_due_date) = DATE(DATE_SUB(NOW(), INTERVAL 1 DAY))
          AND ea.reminder_sent_overdue = 0
      `);

      for (const app of overdueApps) {
        try {
          const result = await this.sendBoothFeeReminder(app.id, 'overdue');
          if (result.success) {
            await db.execute(
              'UPDATE event_applications SET reminder_sent_overdue = 1 WHERE id = ?',
              [app.id]
            );
          }
          results.overdue.push({ applicationId: app.id, success: result.success });
        } catch (error) {
          console.error(`Failed to send overdue reminder for application ${app.id}:`, error);
          results.overdue.push({ applicationId: app.id, success: false, error: error.message });
        }
      }

      // Get applications overdue by 7 days (final notice)
      const [finalNoticeApps] = await db.execute(`
        SELECT ea.id, ea.booth_fee_due_date
        FROM event_applications ea
        WHERE ea.booth_fee_paid = 0
          AND DATE(ea.booth_fee_due_date) = DATE(DATE_SUB(NOW(), INTERVAL 7 DAY))
          AND ea.reminder_sent_final = 0
      `);

      for (const app of finalNoticeApps) {
        try {
          const result = await this.sendBoothFeeReminder(app.id, 'final');
          if (result.success) {
            await db.execute(
              'UPDATE event_applications SET reminder_sent_final = 1 WHERE id = ?',
              [app.id]
            );
          }
          results.final_notice.push({ applicationId: app.id, success: result.success });
        } catch (error) {
          console.error(`Failed to send final notice for application ${app.id}:`, error);
          results.final_notice.push({ applicationId: app.id, success: false, error: error.message });
        }
      }

      return {
        success: true,
        total_processed: dueSoonApps.length + overdueApps.length + finalNoticeApps.length,
        results
      };

    } catch (error) {
      console.error('Error processing automated reminders:', error);
      throw error;
    }
  }

  /**
   * Auto-decline applications that are overdue beyond grace period
   */
  async processAutoDecline() {
    try {
      // Get applications overdue by more than 14 days
      const [overdueApps] = await db.execute(`
        SELECT ea.id, ea.booth_fee_due_date, e.title as event_title
        FROM event_applications ea
        JOIN events e ON ea.event_id = e.id
        WHERE ea.booth_fee_paid = 0
          AND ea.status = 'accepted'
          AND DATE(ea.booth_fee_due_date) < DATE(DATE_SUB(NOW(), INTERVAL 14 DAY))
          AND ea.auto_decline_processed = 0
      `);

      const results = [];
      for (const app of overdueApps) {
        try {
          // Update application status to declined
          await db.execute(
            'UPDATE event_applications SET status = "declined", auto_decline_processed = 1, declined_reason = "Payment overdue - auto-declined" WHERE id = ?',
            [app.id]
          );

          // Cancel payment intent if exists
          const [paymentIntentData] = await db.execute(
            'SELECT payment_intent_id FROM event_booth_fees WHERE application_id = ?',
            [app.id]
          );

          if (paymentIntentData.length > 0) {
            // Cancel the Stripe payment intent
            const stripeService = require('./stripeService');
            try {
              await stripeService.cancelPaymentIntent(paymentIntentData[0].payment_intent_id);
            } catch (stripeError) {
              console.error('Error canceling payment intent:', stripeError);
            }
          }

          results.push({ applicationId: app.id, success: true });
        } catch (error) {
          console.error(`Failed to auto-decline application ${app.id}:`, error);
          results.push({ applicationId: app.id, success: false, error: error.message });
        }
      }

      return {
        success: true,
        total_processed: overdueApps.length,
        declined: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };

    } catch (error) {
      console.error('Error processing auto-decline:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Format date range for display
   */
  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', options);
    } else {
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
  }

  /**
   * Format single date for display
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Log email activity for application
   */
  async logApplicationEmail(applicationId, emailType, success) {
    try {
      await db.execute(`
        INSERT INTO application_email_log (application_id, email_type, sent_at, success)
        VALUES (?, ?, NOW(), ?)
      `, [applicationId, emailType, success ? 1 : 0]);
    } catch (error) {
      console.error('Error logging application email:', error);
    }
  }
}

module.exports = EventEmailService; 
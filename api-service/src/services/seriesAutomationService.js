const db = require('../../config/db');
const EmailService = require('./emailService');

class SeriesAutomationService {
  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Main automation runner - called by cron job
   */
  async runAutomation() {
    console.log('🤖 Starting Series Automation Run...');
    
    try {
      // Run all automation tasks
      await this.generateScheduledEvents();
      await this.processEmailAutomation();
      await this.cleanupOldLogs();
      
      console.log('✅ Series Automation Run Completed Successfully');
    } catch (error) {
      console.error('❌ Series Automation Error:', error);
      await this.logError('automation_run', null, error.message);
    }
  }

  /**
   * Generate events that are due for creation
   */
  async generateScheduledEvents() {
    console.log('🔄 Checking for events to generate...');
    
    try {
      // Get active series that need events generated
      const [seriesList] = await db.execute(`
        SELECT es.*, COUNT(se.event_id) as current_event_count
        FROM event_series es
        LEFT JOIN series_events se ON es.id = se.series_id
        WHERE es.series_status = 'active'
          AND es.auto_generate = 1
          AND (es.next_generation_date <= NOW() OR es.next_generation_date IS NULL)
          AND (es.series_end_date IS NULL OR es.series_end_date > NOW())
        GROUP BY es.id
        HAVING current_event_count < 10 -- Safety limit
      `);

      console.log(`📊 Found ${seriesList.length} series ready for generation`);

      for (const series of seriesList) {
        try {
          await this.generateEventsForSeries(series);
        } catch (error) {
          console.error(`Error generating events for series ${series.id}:`, error);
          await this.logError('event_generation', series.id, error.message);
        }
      }
    } catch (error) {
      console.error('Error in generateScheduledEvents:', error);
      throw error;
    }
  }

  /**
   * Generate events for a specific series
   */
  async generateEventsForSeries(series) {
    console.log(`🎯 Generating events for series: ${series.series_name}`);

    // Get template data
    let templateData = await this.getTemplateData(series);
    
    // Get last sequence number
    const lastSequence = await this.getLastSequenceNumber(series.id);
    
    // Calculate how many events to generate
    const eventsToGenerate = this.calculateEventsToGenerate(series);
    
    let generatedCount = 0;
    
    for (let i = 1; i <= eventsToGenerate; i++) {
      const sequenceNumber = lastSequence + i;
      const eventDates = this.calculateEventDates(series, sequenceNumber);
      
      // Don't generate events too far in the future
      const monthsFromNow = (eventDates.start_date - new Date()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsFromNow > series.generate_months_ahead) {
        break;
      }

      try {
        const eventId = await this.createSeriesEvent(series, templateData, eventDates, sequenceNumber);
        generatedCount++;
        
        await this.logSuccess('event_generation', series.id, eventId, 
          `Generated event ${sequenceNumber} for series ${series.series_name}`);
      } catch (error) {
        console.error(`Failed to create event ${sequenceNumber}:`, error);
        await this.logError('event_generation', series.id, error.message);
      }
    }

    if (generatedCount > 0) {
      // Update next generation date
      const nextGenDate = this.calculateNextGenerationDate(series);
      await db.execute(
        'UPDATE event_series SET next_generation_date = ? WHERE id = ?',
        [nextGenDate, series.id]
      );
      
      console.log(`✅ Generated ${generatedCount} events for ${series.series_name}`);
    }
  }

  /**
   * Process email automation rules
   */
  async processEmailAutomation() {
    console.log('📧 Processing email automation...');
    
    try {
      // Get active automation rules
      const [rules] = await db.execute(`
        SELECT 
          ear.*,
          es.series_name,
          es.promoter_id
        FROM email_automation_rules ear
        JOIN event_series es ON ear.series_id = es.id
        WHERE ear.is_active = 1
          AND es.series_status = 'active'
      `);

      console.log(`📋 Processing ${rules.length} automation rules`);

      for (const rule of rules) {
        try {
          await this.processEmailRule(rule);
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
          await this.logError('email_automation', rule.series_id, error.message);
        }
      }
    } catch (error) {
      console.error('Error in processEmailAutomation:', error);
      throw error;
    }
  }

  /**
   * Process individual email automation rule
   */
  async processEmailRule(rule) {
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + rule.trigger_offset_days);

    let targetUsers = [];

    switch (rule.trigger_type) {
      case 'renewal_reminder':
        targetUsers = await this.getRenewalTargets(rule, triggerDate);
        break;
      case 'event_created':
        targetUsers = await this.getEventCreatedTargets(rule, triggerDate);
        break;
      case 'deadline_approach':
        targetUsers = await this.getDeadlineTargets(rule, triggerDate);
        break;
    }

    // Send emails
    for (const userId of targetUsers) {
      try {
        await this.sendAutomationEmail(rule, userId);
      } catch (error) {
        console.error(`Failed to send automation email to user ${userId}:`, error);
      }
    }

    if (targetUsers.length > 0) {
      console.log(`📤 Sent ${targetUsers.length} emails for rule: ${rule.trigger_type}`);
    }
  }

  /**
   * Send automation email to user
   */
  async sendAutomationEmail(rule, userId) {
    // Get series and user data for template variables
    const [seriesData] = await db.execute(`
      SELECT es.*, u.first_name, u.last_name, u.username as email
      FROM event_series es, users u
      WHERE es.id = ? AND u.id = ?
    `, [rule.series_id, userId]);

    if (seriesData.length === 0) return;

    const data = seriesData[0];
    const templateData = {
      user_name: `${data.first_name} ${data.last_name}`,
      series_name: data.series_name,
      series_description: data.series_description,
      trigger_type: rule.trigger_type,
      days_offset: Math.abs(rule.trigger_offset_days)
    };

    // Use appropriate email template based on trigger type
    const templateKeys = {
      'renewal_reminder': 'series_renewal_reminder',
      'event_created': 'series_event_created',
      'deadline_approach': 'series_deadline_reminder',
      'series_complete': 'series_completion_notice'
    };

    const templateKey = templateKeys[rule.trigger_type] || 'series_notification';
    
    await this.emailService.queueEmail(userId, templateKey, templateData, {
      priority: 3 // Normal priority for automation
    });
  }

  /**
   * Get template data for series
   */
  async getTemplateData(series) {
    if (!series.template_event_id) {
      return this.getDefaultEventData(series);
    }

    const [templateEvent] = await db.execute(
      'SELECT * FROM events WHERE id = ?',
      [series.template_event_id]
    );

    if (templateEvent.length === 0) {
      return this.getDefaultEventData(series);
    }

    const data = templateEvent[0];
    // Remove fields that shouldn't be copied
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    delete data.start_date;
    delete data.end_date;
    
    return data;
  }

  /**
   * Get default event data for series without template
   */
  getDefaultEventData(series) {
    return {
      promoter_id: series.promoter_id,
      event_type_id: 1, // Default to first event type
      title: series.series_name,
      description: series.series_description || 'Automatically generated event from series',
      short_description: `Part of the ${series.series_name} series`,
      event_status: 'draft',
      allow_applications: true,
      application_status: 'not_accepting'
    };
  }

  /**
   * Calculate event dates for sequence number
   */
  calculateEventDates(series, sequenceNumber) {
    const baseDate = new Date(series.series_start_date);
    let eventDate = new Date(baseDate);

    // Calculate the event date based on recurrence pattern
    switch (series.recurrence_pattern) {
      case 'yearly':
        eventDate.setFullYear(baseDate.getFullYear() + ((sequenceNumber - 1) * series.recurrence_interval));
        break;
      case 'quarterly':
        eventDate.setMonth(baseDate.getMonth() + ((sequenceNumber - 1) * 3 * series.recurrence_interval));
        break;
      case 'monthly':
        eventDate.setMonth(baseDate.getMonth() + ((sequenceNumber - 1) * series.recurrence_interval));
        break;
    }

    // Calculate end date (default 3 days later)
    const endDate = new Date(eventDate);
    endDate.setDate(eventDate.getDate() + 2);

    return {
      start_date: eventDate,
      end_date: endDate
    };
  }

  /**
   * Create event for series
   */
  async createSeriesEvent(series, templateData, eventDates, sequenceNumber) {
    // Prepare event data
    const eventData = {
      ...templateData,
      title: `${series.series_name} ${eventDates.start_date.getFullYear()}`,
      start_date: eventDates.start_date.toISOString().split('T')[0],
      end_date: eventDates.end_date.toISOString().split('T')[0],
      promoter_id: series.promoter_id
    };

    // Create event
    const fields = Object.keys(eventData);
    const values = Object.values(eventData);
    const placeholders = fields.map(() => '?').join(', ');

    const [result] = await db.execute(
      `INSERT INTO events (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const eventId = result.insertId;

    // Link to series
    await db.execute(`
      INSERT INTO series_events (series_id, event_id, sequence_number, generation_method)
      VALUES (?, ?, ?, 'auto')
    `, [series.id, eventId, sequenceNumber]);

    return eventId;
  }

  /**
   * Calculate how many events to generate for series
   */
  calculateEventsToGenerate(series) {
    // Generate up to 2 events ahead for each series
    return Math.min(2, series.generate_months_ahead / 6);
  }

  /**
   * Calculate next generation date
   */
  calculateNextGenerationDate(series) {
    const nextDate = new Date();
    
    switch (series.recurrence_pattern) {
      case 'yearly':
        nextDate.setMonth(nextDate.getMonth() + 6); // Check every 6 months for yearly events
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 2); // Check every 2 months for quarterly
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1); // Check monthly
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 3); // Default 3 months
    }
    
    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Get last sequence number for series
   */
  async getLastSequenceNumber(seriesId) {
    const [result] = await db.execute(
      'SELECT COALESCE(MAX(sequence_number), 0) as last_number FROM series_events WHERE series_id = ?',
      [seriesId]
    );
    return result[0].last_number;
  }

  /**
   * Get users for renewal reminders
   */
  async getRenewalTargets(rule, triggerDate) {
    const [users] = await db.execute(`
      SELECT DISTINCT ea.artist_id
      FROM series_events se
      JOIN events e ON se.event_id = e.id
      JOIN event_applications ea ON e.id = ea.event_id
      WHERE se.series_id = ?
        AND e.start_date BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND ?
        AND ea.application_status IN ('accepted', 'paid')
    `, [rule.series_id, triggerDate, triggerDate]);

    return users.map(u => u.artist_id);
  }

  /**
   * Get users for event created notifications
   */
  async getEventCreatedTargets(rule, triggerDate) {
    const [users] = await db.execute(`
      SELECT DISTINCT ea.artist_id
      FROM series_events se
      JOIN events e ON se.event_id = e.id
      JOIN event_applications ea ON e.id = ea.event_id
      WHERE se.series_id = ?
        AND DATE(se.generated_date) = DATE(?)
        AND ea.application_status IN ('accepted', 'paid')
    `, [rule.series_id, triggerDate]);

    return users.map(u => u.artist_id);
  }

  /**
   * Get users for deadline reminders
   */
  async getDeadlineTargets(rule, triggerDate) {
    const [users] = await db.execute(`
      SELECT DISTINCT ea.artist_id
      FROM series_events se
      JOIN events e ON se.event_id = e.id
      JOIN event_applications ea ON e.id = ea.event_id
      WHERE se.series_id = ?
        AND e.application_deadline = ?
        AND ea.application_status = 'pending'
    `, [rule.series_id, triggerDate.toISOString().split('T')[0]]);

    return users.map(u => u.artist_id);
  }

  /**
   * Clean up old automation logs
   */
  async cleanupOldLogs() {
    await db.execute(
      'DELETE FROM automation_logs WHERE execution_time < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
  }

  /**
   * Log successful automation action
   */
  async logSuccess(type, seriesId, eventId, message) {
    await db.execute(`
      INSERT INTO automation_logs (automation_type, series_id, event_id, status, message)
      VALUES (?, ?, ?, 'success', ?)
    `, [type, seriesId, eventId, message]);
  }

  /**
   * Log automation error
   */
  async logError(type, seriesId, message) {
    await db.execute(`
      INSERT INTO automation_logs (automation_type, series_id, status, message)
      VALUES (?, ?, 'failed', ?)
    `, [type, seriesId, message]);
  }
}

module.exports = SeriesAutomationService; 
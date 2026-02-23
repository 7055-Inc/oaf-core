const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

/**
 * @fileoverview Event series management routes
 * 
 * Handles comprehensive event series functionality including:
 * - Event series CRUD operations with recurrence patterns
 * - Event template management and reusability
 * - Automated event generation based on series patterns
 * - Email automation rules and trigger management
 * - Series-based event scheduling and lifecycle management
 * - Template creation from existing events
 * 
 * All endpoints require authentication and proper ownership validation.
 * Supports yearly, quarterly, and monthly recurrence patterns.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ================================
// EVENT SERIES MANAGEMENT
// ================================

/**
 * Get all event series for promoter
 * @route GET /api/series
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of promoter's event series with statistics
 * @description Retrieves all event series for authenticated promoter with event counts and date ranges
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const promoterId = req.userId;
    
    const [series] = await db.execute(`
      SELECT 
        es.*,
        COUNT(se.event_id) as events_count,
        MAX(e.start_date) as latest_event_date,
        MIN(e.start_date) as earliest_event_date
      FROM event_series es
      LEFT JOIN series_events se ON es.id = se.series_id
      LEFT JOIN events e ON se.event_id = e.id
      WHERE es.promoter_id = ?
      GROUP BY es.id
      ORDER BY es.created_at DESC
    `, [promoterId]);

    res.json({ success: true, series });
  } catch (err) {
    console.error('Error fetching series:', err);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

/**
 * Get specific event series details
 * @route GET /api/series/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Series ID
 * @param {Object} res - Express response object
 * @returns {Object} Complete series details with events and automation rules
 * @description Retrieves detailed series information including associated events and automation rules
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;

    // Get series info
    const [series] = await db.execute(`
      SELECT es.*, et.template_name, e.title as template_event_title
      FROM event_series es
      LEFT JOIN event_templates et ON es.template_event_id = et.id
      LEFT JOIN events e ON es.template_event_id = e.id
      WHERE es.id = ? AND es.promoter_id = ?
    `, [id, promoterId]);

    if (series.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    // Get associated events
    const [events] = await db.execute(`
      SELECT 
        e.*, se.sequence_number, se.generated_date, se.generation_method
      FROM series_events se
      JOIN events e ON se.event_id = e.id
      WHERE se.series_id = ?
      ORDER BY se.sequence_number ASC
    `, [id]);

    // Get automation rules
    const [automationRules] = await db.execute(`
      SELECT * FROM email_automation_rules
      WHERE series_id = ?
      ORDER BY trigger_type, trigger_offset_days
    `, [id]);

    res.json({ 
      success: true, 
      series: series[0], 
      events, 
      automation_rules: automationRules 
    });
  } catch (err) {
    console.error('Error fetching series details:', err);
    res.status(500).json({ error: 'Failed to fetch series details' });
  }
});

/**
 * Create new event series
 * @route POST /api/series
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.body.series_name - Series name (required)
 * @param {string} req.body.series_description - Series description (optional)
 * @param {string} req.body.recurrence_pattern - Recurrence pattern (yearly/quarterly/monthly) (required)
 * @param {number} req.body.recurrence_interval - Recurrence interval (required)
 * @param {string} req.body.series_start_date - Series start date (required)
 * @param {string} req.body.series_end_date - Series end date (optional)
 * @param {number} req.body.template_event_id - Template event ID (optional)
 * @param {boolean} req.body.auto_generate - Auto-generate events flag (optional)
 * @param {number} req.body.generate_months_ahead - Months ahead to generate (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Created series ID and success message
 * @description Creates new event series with recurrence pattern and automation settings
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const promoterId = req.userId;
    const { 
      series_name, 
      series_description, 
      recurrence_pattern, 
      recurrence_interval, 
      series_start_date,
      series_end_date,
      template_event_id,
      auto_generate,
      generate_months_ahead 
    } = req.body;

    if (!series_name || !recurrence_pattern || !series_start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate next generation date
    const nextGenDate = new Date(series_start_date);
    nextGenDate.setMonth(nextGenDate.getMonth() + (generate_months_ahead || 12));

    const [result] = await db.execute(`
      INSERT INTO event_series (
        series_name, series_description, promoter_id, recurrence_pattern, 
        recurrence_interval, series_start_date, series_end_date, 
        template_event_id, auto_generate, generate_months_ahead, next_generation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      series_name, series_description, promoterId, recurrence_pattern,
      recurrence_interval, series_start_date, series_end_date || null,
      template_event_id || null, auto_generate || true, generate_months_ahead || 12, nextGenDate
    ]);

    // Log the creation
    await db.execute(`
      INSERT INTO automation_logs (automation_type, series_id, status, message)
      VALUES ('event_generation', ?, 'success', 'Event series created')
    `, [result.insertId]);

    res.status(201).json({ 
      success: true, 
      series_id: result.insertId,
      message: 'Event series created successfully' 
    });
  } catch (err) {
    console.error('Error creating series:', err);
    res.status(500).json({ error: 'Failed to create series' });
  }
});

/**
 * Update event series
 * @route PUT /api/series/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Series ID
 * @param {Object} req.body - Update data (various optional fields)
 * @param {Object} res - Express response object
 * @returns {Object} Update success message
 * @description Updates event series with dynamic field updates and ownership validation
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;
    const updateData = req.body;

    // Verify ownership
    const [series] = await db.execute(
      'SELECT id FROM event_series WHERE id = ? AND promoter_id = ?',
      [id, promoterId]
    );

    if (series.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    // Build dynamic update query
    const allowedFields = [
      'series_name', 'series_description', 'recurrence_pattern', 'recurrence_interval',
      'series_status', 'auto_generate', 'generate_months_ahead', 'series_end_date'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    await db.execute(
      `UPDATE event_series SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Series updated successfully' });
  } catch (err) {
    console.error('Error updating series:', err);
    res.status(500).json({ error: 'Failed to update series' });
  }
});

/**
 * Generate next event in series
 * @route POST /api/series/:id/generate
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Series ID
 * @param {Object} res - Express response object
 * @returns {Object} Generated event ID and success message
 * @description Manually generates next event in series based on recurrence pattern and template
 */
router.post('/:id/generate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;

    // Get series info
    const [series] = await db.execute(
      'SELECT * FROM event_series WHERE id = ? AND promoter_id = ?',
      [id, promoterId]
    );

    if (series.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const seriesInfo = series[0];

    // Get template event data
    let templateData = {};
    if (seriesInfo.template_event_id) {
      const [templateEvent] = await db.execute(
        'SELECT * FROM events WHERE id = ?',
        [seriesInfo.template_event_id]
      );

      if (templateEvent.length > 0) {
        templateData = templateEvent[0];
        delete templateData.id;
        delete templateData.created_at;
        delete templateData.updated_at;
      }
    }

    // Calculate next event dates
    const lastEventNumber = await getLastSequenceNumber(id);
    const nextEventDates = calculateNextEventDates(seriesInfo, lastEventNumber + 1);

    // Create new event
    const newEventData = {
      ...templateData,
      title: `${seriesInfo.series_name} ${nextEventDates.year}`,
      start_date: nextEventDates.start_date,
      end_date: nextEventDates.end_date,
      promoter_id: promoterId,
      event_status: 'draft'
    };

    const eventId = await createEventFromTemplate(newEventData);

    // Link to series
    await db.execute(`
      INSERT INTO series_events (series_id, event_id, sequence_number, generation_method)
      VALUES (?, ?, ?, 'manual')
    `, [id, eventId, lastEventNumber + 1]);

    // Log generation
    await db.execute(`
      INSERT INTO automation_logs (automation_type, series_id, event_id, status, message)
      VALUES ('event_generation', ?, ?, 'success', 'Event generated manually')
    `, [id, eventId]);

    res.json({ 
      success: true, 
      event_id: eventId,
      message: 'Next event generated successfully' 
    });
  } catch (err) {
    console.error('Error generating next event:', err);
    res.status(500).json({ error: 'Failed to generate next event' });
  }
});

// ================================
// EVENT TEMPLATES
// ================================

/**
 * Get event templates for promoter
 * @route GET /api/series/templates/my
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of available templates with usage statistics
 * @description Retrieves event templates owned by promoter or public templates with usage counts
 */
router.get('/templates/my', verifyToken, async (req, res) => {
  try {
    const promoterId = req.userId;

    const [templates] = await db.execute(`
      SELECT 
        et.*,
        (SELECT COUNT(*) FROM event_series WHERE template_event_id IS NOT NULL AND 
         JSON_EXTRACT(template_config, '$.template_id') = et.id) as usage_count
      FROM event_templates et
      WHERE et.promoter_id = ? OR et.is_public = 1
      ORDER BY et.created_at DESC
    `, [promoterId]);

    res.json({ success: true, templates });
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Create template from existing event
 * @route POST /api/series/templates/from-event/:eventId
 * @access Private (requires authentication and event ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.eventId - Event ID to create template from
 * @param {string} req.body.template_name - Template name (required)
 * @param {string} req.body.description - Template description (optional)
 * @param {boolean} req.body.is_public - Public template flag (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Created template ID and success message
 * @description Creates reusable event template from existing event with configuration data
 */
router.post('/templates/from-event/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { template_name, description, is_public } = req.body;
    const promoterId = req.userId;

    // Get event data
    const [event] = await db.execute(
      'SELECT * FROM events WHERE id = ? AND promoter_id = ?',
      [eventId, promoterId]
    );

    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = event[0];
    delete eventData.id;
    delete eventData.created_at;
    delete eventData.updated_at;

    // Create template
    const [result] = await db.execute(`
      INSERT INTO event_templates (template_name, promoter_id, template_config, description, is_public)
      VALUES (?, ?, ?, ?, ?)
    `, [template_name, promoterId, JSON.stringify(eventData), description || null, is_public || false]);

    res.status(201).json({ 
      success: true, 
      template_id: result.insertId,
      message: 'Template created from event' 
    });
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ================================
// AUTOMATION RULES
// ================================

/**
 * Get automation rules for series
 * @route GET /api/series/:id/automation
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Series ID
 * @param {Object} res - Express response object
 * @returns {Object} List of automation rules for the series
 * @description Retrieves email automation rules configured for the event series
 */
router.get('/:id/automation', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;

    // Verify series ownership
    const [series] = await db.execute(
      'SELECT id FROM event_series WHERE id = ? AND promoter_id = ?',
      [id, promoterId]
    );

    if (series.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const [rules] = await db.execute(
      'SELECT * FROM email_automation_rules WHERE series_id = ? ORDER BY trigger_type',
      [id]
    );

    res.json({ success: true, automation_rules: rules });
  } catch (err) {
    console.error('Error fetching automation rules:', err);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

/**
 * Create automation rule for series
 * @route POST /api/series/:id/automation
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Series ID
 * @param {string} req.body.trigger_type - Trigger type for automation
 * @param {number} req.body.trigger_offset_days - Days offset for trigger (optional)
 * @param {string} req.body.target_audience - Target audience (optional, default: 'artists')
 * @param {number} req.body.template_id - Email template ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Created rule ID and success message
 * @description Creates email automation rule for series with trigger and audience configuration
 */
router.post('/:id/automation', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { trigger_type, trigger_offset_days, target_audience, template_id } = req.body;
    const promoterId = req.userId;

    // Verify series ownership
    const [series] = await db.execute(
      'SELECT id FROM event_series WHERE id = ? AND promoter_id = ?',
      [id, promoterId]
    );

    if (series.length === 0) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const [result] = await db.execute(`
      INSERT INTO email_automation_rules (series_id, trigger_type, trigger_offset_days, target_audience, template_id)
      VALUES (?, ?, ?, ?, ?)
    `, [id, trigger_type, trigger_offset_days || 0, target_audience || 'artists', template_id || null]);

    res.status(201).json({ 
      success: true, 
      rule_id: result.insertId,
      message: 'Automation rule created' 
    });
  } catch (err) {
    console.error('Error creating automation rule:', err);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get last sequence number for series
 * @param {number} seriesId - Series ID
 * @returns {Promise<number>} Last sequence number (0 if no events)
 * @description Retrieves the highest sequence number for events in the series
 */
async function getLastSequenceNumber(seriesId) {
  const [result] = await db.execute(
    'SELECT COALESCE(MAX(sequence_number), 0) as last_number FROM series_events WHERE series_id = ?',
    [seriesId]
  );
  return result[0].last_number;
}

/**
 * Calculate next event dates based on recurrence pattern
 * @param {Object} seriesInfo - Series configuration object
 * @param {number} sequenceNumber - Sequence number for the new event
 * @returns {Object} Object with start_date, end_date, and year
 * @description Calculates event dates based on series recurrence pattern and sequence number
 */
function calculateNextEventDates(seriesInfo, sequenceNumber) {
  const baseDate = new Date(seriesInfo.series_start_date);
  let nextDate = new Date(baseDate);

  // Calculate next occurrence based on pattern
  switch (seriesInfo.recurrence_pattern) {
    case 'yearly':
      nextDate.setFullYear(baseDate.getFullYear() + ((sequenceNumber - 1) * seriesInfo.recurrence_interval));
      break;
    case 'quarterly':
      nextDate.setMonth(baseDate.getMonth() + ((sequenceNumber - 1) * 3 * seriesInfo.recurrence_interval));
      break;
    case 'monthly':
      nextDate.setMonth(baseDate.getMonth() + ((sequenceNumber - 1) * seriesInfo.recurrence_interval));
      break;
  }

  // Calculate end date (assuming same duration as original)
  const endDate = new Date(nextDate);
  if (seriesInfo.template_event_id) {
    // Would need to get duration from template event
    endDate.setDate(nextDate.getDate() + 3); // Default 3-day event
  } else {
    endDate.setDate(nextDate.getDate() + 1); // Default 1-day event
  }

  return {
    start_date: nextDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    year: nextDate.getFullYear()
  };
}

/**
 * Create event from template data
 * @param {Object} eventData - Event data object
 * @returns {Promise<number>} Created event ID
 * @description Creates new event record from template data with dynamic field insertion
 */
async function createEventFromTemplate(eventData) {
  const fields = Object.keys(eventData);
  const values = Object.values(eventData);
  const placeholders = fields.map(() => '?').join(', ');

  const [result] = await db.execute(
    `INSERT INTO events (${fields.join(', ')}) VALUES (${placeholders})`,
    values
  );

  return result.insertId;
}

module.exports = router; 
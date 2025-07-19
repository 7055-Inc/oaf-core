const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const { verifyToken } = require('../../middleware/auth');
const { requireRestrictedPermission } = require('../../middleware/permissions');

// ================================
// EVENT SERIES MANAGEMENT
// ================================

// Get all series for a promoter
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

// Get specific series details
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

// Create new event series
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

// Update event series
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

// Generate next event in series
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

// Get templates for promoter
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

// Create template from existing event
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

// Get automation rules for series
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

// Create automation rule
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

async function getLastSequenceNumber(seriesId) {
  const [result] = await db.execute(
    'SELECT COALESCE(MAX(sequence_number), 0) as last_number FROM series_events WHERE series_id = ?',
    [seriesId]
  );
  return result[0].last_number;
}

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
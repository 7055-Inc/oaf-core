/**
 * Campaign Service
 * Handles all campaign CRUD operations, steps, and triggers
 */

const db = require('../../../../config/db');

class CampaignService {
  /**
   * Get all campaigns with optional filters
   * 
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Campaigns and pagination info
   */
  async getAllCampaigns(filters = {}, pagination = {}) {
    const { category, is_system, is_active, page = 1, limit = 50 } = { ...filters, ...pagination };
    const offset = (page - 1) * limit;
    
    let whereClause = [];
    let params = [];
    
    if (category) {
      whereClause.push('category = ?');
      params.push(category);
    }
    
    if (is_system !== undefined) {
      whereClause.push('is_system = ?');
      params.push(is_system ? 1 : 0);
    }
    
    if (is_active !== undefined) {
      whereClause.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM drip_campaigns ${where}`,
      params
    );
    const total = countResult[0].total;
    
    // Get campaigns
    const [campaigns] = await db.execute(
      `SELECT * FROM drip_campaigns ${where} ORDER BY priority_level DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return {
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single campaign by ID with steps, triggers, and analytics
   * 
   * @param {number} id - Campaign ID
   * @returns {Promise<Object>} Campaign with related data
   */
  async getCampaignById(id) {
    const [campaigns] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ?',
      [id]
    );
    
    if (campaigns.length === 0) {
      return null;
    }
    
    const campaign = campaigns[0];
    
    // Get steps
    const [steps] = await db.execute(
      'SELECT * FROM drip_steps WHERE campaign_id = ? ORDER BY step_number ASC',
      [id]
    );
    
    // Get triggers
    const [triggers] = await db.execute(
      'SELECT * FROM drip_triggers WHERE campaign_id = ? ORDER BY created_at ASC',
      [id]
    );
    
    // Get analytics summary
    const [analytics] = await db.execute(
      `SELECT 
        SUM(enrollments_count) as total_enrollments,
        SUM(emails_sent) as total_emails_sent,
        AVG(open_rate) as avg_open_rate,
        AVG(click_rate) as avg_click_rate,
        SUM(conversions_count) as total_conversions,
        SUM(revenue_attributed) as total_revenue
      FROM drip_analytics 
      WHERE campaign_id = ?`,
      [id]
    );
    
    return {
      campaign,
      steps,
      triggers,
      analytics: analytics[0] || {}
    };
  }

  /**
   * Create new campaign with steps and triggers
   * 
   * @param {Object} campaignData - Campaign data including steps and triggers
   * @returns {Promise<Object>} Created campaign with steps and triggers
   */
  async createCampaign(campaignData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        campaign_key,
        name,
        description,
        category = 'marketing',
        is_system = 0,
        created_by = null,
        user_tier_required = 'free',
        is_active = 1,
        is_published = 0,
        priority_level = 3,
        counts_toward_daily_limit = 1,
        min_hours_between_emails = 2,
        conversion_goal_type,
        conversion_goal_config,
        attribution_window_hours = 168,
        steps = [],
        triggers = []
      } = campaignData;
      
      // Insert campaign
      const [result] = await connection.execute(
        `INSERT INTO drip_campaigns (
          campaign_key, name, description, category, is_system, created_by,
          user_tier_required, is_active, is_published, priority_level,
          counts_toward_daily_limit, min_hours_between_emails,
          conversion_goal_type, conversion_goal_config, attribution_window_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaign_key, name, description, category, is_system, created_by,
          user_tier_required, is_active, is_published, priority_level,
          counts_toward_daily_limit, min_hours_between_emails,
          conversion_goal_type, 
          conversion_goal_config ? JSON.stringify(conversion_goal_config) : null,
          attribution_window_hours
        ]
      );
      
      const campaignId = result.insertId;
      
      // Insert steps
      const createdSteps = [];
      for (const step of steps) {
        const [stepResult] = await connection.execute(
          `INSERT INTO drip_steps (
            campaign_id, step_number, step_name, template_key,
            delay_amount, delay_unit, delay_from,
            expires_at, expires_after_enrollment_days,
            send_conditions, exit_conditions,
            conversion_goal_type, conversion_goal_config, attribution_window_hours,
            variable_config
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            campaignId,
            step.step_number,
            step.step_name || null,
            step.template_key,
            step.delay_amount,
            step.delay_unit || 'days',
            step.delay_from || 'previous_step',
            step.expires_at || null,
            step.expires_after_enrollment_days || null,
            step.send_conditions ? JSON.stringify(step.send_conditions) : null,
            step.exit_conditions ? JSON.stringify(step.exit_conditions) : null,
            step.conversion_goal_type || null,
            step.conversion_goal_config ? JSON.stringify(step.conversion_goal_config) : null,
            step.attribution_window_hours || null,
            step.variable_config ? JSON.stringify(step.variable_config) : null
          ]
        );
        
        createdSteps.push({ id: stepResult.insertId, ...step });
      }
      
      // Insert triggers
      const createdTriggers = [];
      for (const trigger of triggers) {
        const [triggerResult] = await connection.execute(
          `INSERT INTO drip_triggers (
            campaign_id, trigger_type, event_name, event_conditions,
            behavior_type, behavior_rule, schedule_config, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            campaignId,
            trigger.trigger_type,
            trigger.event_name || null,
            trigger.event_conditions ? JSON.stringify(trigger.event_conditions) : null,
            trigger.behavior_type || null,
            trigger.behavior_rule ? JSON.stringify(trigger.behavior_rule) : null,
            trigger.schedule_config ? JSON.stringify(trigger.schedule_config) : null,
            trigger.is_active !== undefined ? trigger.is_active : 1
          ]
        );
        
        createdTriggers.push({ id: triggerResult.insertId, ...trigger });
      }
      
      await connection.commit();
      
      // Fetch created campaign
      const [campaigns] = await connection.execute(
        'SELECT * FROM drip_campaigns WHERE id = ?',
        [campaignId]
      );
      
      return {
        campaign: campaigns[0],
        steps: createdSteps,
        triggers: createdTriggers
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update campaign
   * 
   * @param {number} id - Campaign ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated campaign
   */
  async updateCampaign(id, updates) {
    const allowedFields = [
      'name', 'description', 'category', 'is_active', 'is_published',
      'priority_level', 'counts_toward_daily_limit', 'min_hours_between_emails',
      'conversion_goal_type', 'conversion_goal_config', 'attribution_window_hours',
      'user_tier_required'
    ];
    
    const setClause = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'conversion_goal_config' && updates[field]) {
          setClause.push(`${field} = ?`);
          params.push(JSON.stringify(updates[field]));
        } else {
          setClause.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE drip_campaigns SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    
    return await this.getCampaignById(id);
  }

  /**
   * Delete campaign (and cascade to steps, triggers, enrollments)
   * 
   * @param {number} id - Campaign ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCampaign(id) {
    const [result] = await db.execute(
      'DELETE FROM drip_campaigns WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Publish campaign (make visible to users)
   * 
   * @param {number} id - Campaign ID
   * @returns {Promise<Object>} Updated campaign
   */
  async publishCampaign(id) {
    await db.execute(
      'UPDATE drip_campaigns SET is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    return await this.getCampaignById(id);
  }

  /**
   * Unpublish campaign
   * 
   * @param {number} id - Campaign ID
   * @returns {Promise<Object>} Updated campaign
   */
  async unpublishCampaign(id) {
    await db.execute(
      'UPDATE drip_campaigns SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    return await this.getCampaignById(id);
  }

  // ============================================
  // STEP MANAGEMENT
  // ============================================

  /**
   * Add step to campaign
   * 
   * @param {number} campaignId - Campaign ID
   * @param {Object} stepData - Step configuration
   * @returns {Promise<Object>} Created step
   */
  async addStep(campaignId, stepData) {
    const [result] = await db.execute(
      `INSERT INTO drip_steps (
        campaign_id, step_number, step_name, template_key,
        delay_amount, delay_unit, delay_from,
        expires_at, expires_after_enrollment_days,
        send_conditions, exit_conditions,
        conversion_goal_type, conversion_goal_config, attribution_window_hours,
        variable_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId,
        stepData.step_number,
        stepData.step_name || null,
        stepData.template_key,
        stepData.delay_amount,
        stepData.delay_unit || 'days',
        stepData.delay_from || 'previous_step',
        stepData.expires_at || null,
        stepData.expires_after_enrollment_days || null,
        stepData.send_conditions ? JSON.stringify(stepData.send_conditions) : null,
        stepData.exit_conditions ? JSON.stringify(stepData.exit_conditions) : null,
        stepData.conversion_goal_type || null,
        stepData.conversion_goal_config ? JSON.stringify(stepData.conversion_goal_config) : null,
        stepData.attribution_window_hours || null,
        stepData.variable_config ? JSON.stringify(stepData.variable_config) : null
      ]
    );
    
    const [steps] = await db.execute(
      'SELECT * FROM drip_steps WHERE id = ?',
      [result.insertId]
    );
    
    return steps[0];
  }

  /**
   * Update step
   * 
   * @param {number} id - Step ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated step
   */
  async updateStep(id, updates) {
    const allowedFields = [
      'step_number', 'step_name', 'template_key', 'delay_amount', 'delay_unit', 'delay_from',
      'expires_at', 'expires_after_enrollment_days', 'send_conditions', 'exit_conditions',
      'conversion_goal_type', 'conversion_goal_config', 'attribution_window_hours', 'variable_config'
    ];
    
    const setClause = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (['send_conditions', 'exit_conditions', 'conversion_goal_config', 'variable_config'].includes(field) && updates[field]) {
          setClause.push(`${field} = ?`);
          params.push(JSON.stringify(updates[field]));
        } else {
          setClause.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE drip_steps SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    
    const [steps] = await db.execute(
      'SELECT * FROM drip_steps WHERE id = ?',
      [id]
    );
    
    return steps[0];
  }

  /**
   * Delete step
   * 
   * @param {number} id - Step ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteStep(id) {
    const [result] = await db.execute(
      'DELETE FROM drip_steps WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Reorder steps in campaign
   * 
   * @param {number} campaignId - Campaign ID
   * @param {Array<number>} stepIds - Array of step IDs in new order
   * @returns {Promise<Array>} Updated steps
   */
  async reorderSteps(campaignId, stepIds) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update each step's number
      for (let i = 0; i < stepIds.length; i++) {
        await connection.execute(
          'UPDATE drip_steps SET step_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND campaign_id = ?',
          [i + 1, stepIds[i], campaignId]
        );
      }
      
      await connection.commit();
      
      const [steps] = await connection.execute(
        'SELECT * FROM drip_steps WHERE campaign_id = ? ORDER BY step_number ASC',
        [campaignId]
      );
      
      return steps;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // TRIGGER MANAGEMENT
  // ============================================

  /**
   * Add trigger to campaign
   * 
   * @param {number} campaignId - Campaign ID
   * @param {Object} triggerData - Trigger configuration
   * @returns {Promise<Object>} Created trigger
   */
  async addTrigger(campaignId, triggerData) {
    const [result] = await db.execute(
      `INSERT INTO drip_triggers (
        campaign_id, trigger_type, event_name, event_conditions,
        behavior_type, behavior_rule, schedule_config, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId,
        triggerData.trigger_type,
        triggerData.event_name || null,
        triggerData.event_conditions ? JSON.stringify(triggerData.event_conditions) : null,
        triggerData.behavior_type || null,
        triggerData.behavior_rule ? JSON.stringify(triggerData.behavior_rule) : null,
        triggerData.schedule_config ? JSON.stringify(triggerData.schedule_config) : null,
        triggerData.is_active !== undefined ? triggerData.is_active : 1
      ]
    );
    
    const [triggers] = await db.execute(
      'SELECT * FROM drip_triggers WHERE id = ?',
      [result.insertId]
    );
    
    return triggers[0];
  }

  /**
   * Update trigger
   * 
   * @param {number} id - Trigger ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated trigger
   */
  async updateTrigger(id, updates) {
    const allowedFields = [
      'trigger_type', 'event_name', 'event_conditions', 'behavior_type',
      'behavior_rule', 'schedule_config', 'is_active'
    ];
    
    const setClause = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (['event_conditions', 'behavior_rule', 'schedule_config'].includes(field) && updates[field]) {
          setClause.push(`${field} = ?`);
          params.push(JSON.stringify(updates[field]));
        } else {
          setClause.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE drip_triggers SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    
    const [triggers] = await db.execute(
      'SELECT * FROM drip_triggers WHERE id = ?',
      [id]
    );
    
    return triggers[0];
  }

  /**
   * Delete trigger
   * 
   * @param {number} id - Trigger ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTrigger(id) {
    const [result] = await db.execute(
      'DELETE FROM drip_triggers WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get active triggers by type
   * 
   * @param {string} triggerType - Type of trigger (event, behavior_threshold, etc.)
   * @returns {Promise<Array>} Active triggers
   */
  async getActiveTriggers(triggerType = null) {
    let query = `
      SELECT dt.*, dc.campaign_key, dc.name as campaign_name, dc.priority_level
      FROM drip_triggers dt
      JOIN drip_campaigns dc ON dt.campaign_id = dc.id
      WHERE dt.is_active = 1 AND dc.is_active = 1
    `;
    
    const params = [];
    
    if (triggerType) {
      query += ' AND dt.trigger_type = ?';
      params.push(triggerType);
    }
    
    query += ' ORDER BY dc.priority_level DESC';
    
    const [triggers] = await db.execute(query, params);
    return triggers;
  }
}

module.exports = new CampaignService();

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission, requirePermission } = require('../middleware/permissions');

/**
 * Finance API Routes
 * 
 * These routes handle financial data including commission rates,
 * vendor earnings, and platform financial metrics.
 * 
 * All routes require authentication and appropriate permissions.
 */

// ============================================================================
// COMMISSION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/finance/commission-rates - Get all commission rates for admin management
 * Returns combined list of artists and promoters with their commission settings
 */
router.get('/commission-rates', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const query = `
      SELECT 
        fs.id as setting_id,
        fs.user_id,
        fs.user_type,
        fs.fee_structure,
        fs.commission_rate,
        fs.notes,
        fs.is_active,
        fs.effective_date,
        fs.updated_at,
        u.username as email,
        up.display_name,
        up.first_name,
        up.last_name,
        CASE 
          WHEN fs.user_type = 'artist' THEN ap.business_name
          WHEN fs.user_type = 'promoter' THEN pp.business_name
          ELSE NULL
        END as business_name,
        vs.stripe_account_id,
        vs.stripe_account_verified
      FROM financial_settings fs
      JOIN users u ON fs.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id AND fs.user_type = 'artist'
      LEFT JOIN promoter_profiles pp ON u.id = pp.user_id AND fs.user_type = 'promoter'
      LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
      WHERE fs.is_active = TRUE
      ORDER BY fs.user_type, up.display_name, up.first_name, up.last_name
    `;
    
    const [results] = await db.query(query);
    
    res.json({
      success: true,
      commission_rates: results,
      count: results.length,
      summary: {
        artists: results.filter(r => r.user_type === 'artist').length,
        promoters: results.filter(r => r.user_type === 'promoter').length,
        commission_users: results.filter(r => r.fee_structure === 'commission').length,
        passthrough_users: results.filter(r => r.fee_structure === 'passthrough').length
      }
    });
    
  } catch (error) {
    console.error('Error fetching commission rates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch commission rates' 
    });
  }
});

/**
 * PUT /api/finance/commission-rates/bulk - Bulk update commission rates
 * Updates multiple commission rates at once
 */
router.put('/commission-rates/bulk', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { updates } = req.body;
    const adminId = req.userId;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required and must not be empty'
      });
    }
    
    const results = {
      success: [],
      errors: []
    };
    
    // Process each update
    for (const update of updates) {
      try {
        const { id, commission_rate, fee_structure, notes } = update;
        
        if (!id) {
          results.errors.push({ id: 'unknown', error: 'ID is required' });
          continue;
        }
        
        // Validate commission rate if provided
        if (commission_rate !== undefined && (commission_rate < 0 || commission_rate > 100)) {
          results.errors.push({ id, error: 'Commission rate must be between 0 and 100' });
          continue;
        }
        
        // Validate fee structure if provided
        if (fee_structure && !['commission', 'passthrough'].includes(fee_structure)) {
          results.errors.push({ id, error: 'Invalid fee structure' });
          continue;
        }
        
        const updateQuery = `
          UPDATE financial_settings 
          SET 
            commission_rate = COALESCE(?, commission_rate),
            fee_structure = COALESCE(?, fee_structure),
            notes = COALESCE(?, notes),
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND is_active = TRUE
        `;
        
        const [result] = await db.query(updateQuery, [
          commission_rate || null,
          fee_structure || null,
          notes || null,
          adminId,
          id
        ]);
        
        if (result.affectedRows === 0) {
          results.errors.push({ id, error: 'Setting not found or inactive' });
        } else {
          results.success.push({ id, message: 'Updated successfully' });
        }
        
      } catch (error) {
        results.errors.push({ id: update.id || 'unknown', error: error.message });
      }
    }
    
    res.json({
      success: true,
      results: results,
      summary: {
        total_updates: updates.length,
        successful: results.success.length,
        failed: results.errors.length
      }
    });
    
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk update'
    });
  }
});

/**
 * PUT /api/finance/commission-rates/:id - Update a single commission rate
 * Updates commission rate, fee structure, or notes for a specific user
 */
router.put('/commission-rates/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const settingId = req.params.id;
    const { commission_rate, fee_structure, notes } = req.body;
    const adminId = req.userId;
    
    // Validate fee structure
    if (fee_structure && !['commission', 'passthrough'].includes(fee_structure)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fee structure. Must be "commission" or "passthrough"'
      });
    }
    
    // Validate commission rate (if provided)
    if (commission_rate !== undefined) {
      if (commission_rate < 0 || commission_rate > 100) {
        return res.status(400).json({
          success: false,
          error: 'Commission rate must be between 0 and 100'
        });
      }
    }
    
    // Update the financial setting
    const updateQuery = `
      UPDATE financial_settings 
      SET 
        commission_rate = COALESCE(?, commission_rate),
        fee_structure = COALESCE(?, fee_structure),
        notes = COALESCE(?, notes),
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = TRUE
    `;
    
    const [result] = await db.query(updateQuery, [
      commission_rate || null,
      fee_structure || null,
      notes || null,
      adminId,
      settingId
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Commission rate setting not found or inactive'
      });
    }
    
    res.json({
      success: true,
      message: 'Commission rate updated successfully',
      updated_fields: {
        commission_rate: commission_rate || 'unchanged',
        fee_structure: fee_structure || 'unchanged',
        notes: notes || 'unchanged'
      }
    });
    
  } catch (error) {
    console.error('Error updating commission rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update commission rate'
    });
  }
});

// ============================================================================
// VENDOR EARNINGS ROUTES (Coming Soon)
// ============================================================================

/**
 * GET /api/finance/vendor-earnings - Get earnings for current vendor
 * Returns earnings data for the authenticated vendor
 */
router.get('/vendor-earnings', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    // TODO: Implement vendor earnings endpoint
    res.json({
      success: true,
      message: 'Vendor earnings endpoint - Coming soon',
      vendor_id: req.userId
    });
  } catch (error) {
    console.error('Error fetching vendor earnings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch vendor earnings' 
    });
  }
});

module.exports = router; 
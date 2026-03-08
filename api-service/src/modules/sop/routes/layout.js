/**
 * SOP Layout Routes
 * Manages global header/footer blocks
 */

const express = require('express');
const { layoutService } = require('../services');

const router = express.Router();

/**
 * Parse JSON fields from database rows
 */
function parseJsonFields(row) {
  if (!row) return row;
  
  const out = { ...row };
  if (out.header_blocks != null && typeof out.header_blocks === 'string') {
    try {
      out.header_blocks = JSON.parse(out.header_blocks);
    } catch {
      // Keep as string if parse fails
    }
  }
  if (out.footer_blocks != null && typeof out.footer_blocks === 'string') {
    try {
      out.footer_blocks = JSON.parse(out.footer_blocks);
    } catch {
      // Keep as string if parse fails
    }
  }
  return out;
}

/**
 * GET /api/v2/sop/layout
 * Get current layout settings
 */
router.get('/', async (req, res) => {
  try {
    const layout = await layoutService.get();
    res.json({ success: true, data: parseJsonFields(layout) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v2/sop/layout
 * Update layout settings
 */
router.put('/', async (req, res) => {
  try {
    const { header_blocks, footer_blocks, updated_by } = req.body;
    const layout = await layoutService.update({ header_blocks, footer_blocks }, updated_by);
    res.json({ success: true, data: parseJsonFields(layout) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

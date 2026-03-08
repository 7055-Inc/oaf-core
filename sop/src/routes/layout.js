const express = require('express');
const layoutService = require('../services/layout');

const router = express.Router();

function parseJsonFields(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.header_blocks != null && typeof out.header_blocks === 'string') out.header_blocks = JSON.parse(out.header_blocks);
  if (out.footer_blocks != null && typeof out.footer_blocks === 'string') out.footer_blocks = JSON.parse(out.footer_blocks);
  return out;
}

router.get('/', async (req, res) => {
  try {
    const layout = await layoutService.get();
    res.json({ success: true, data: parseJsonFields(layout) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

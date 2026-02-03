const express = require('express');
const sopsService = require('../services/sops');

const router = express.Router();

function parseJsonFields(row) {
  if (!row) return row;
  const jsonKeys = ['standard_workflow', 'exit_points', 'escalation', 'transfer', 'additional_information', 'related_sop_ids'];
  const out = { ...row };
  for (const key of jsonKeys) {
    if (out[key] != null && typeof out[key] === 'string') out[key] = JSON.parse(out[key]);
  }
  return out;
}

router.get('/', async (req, res) => {
  try {
    const { folder_id, status, search, limit, offset } = req.query;
    const filters = {};
    if (folder_id !== undefined) filters.folder_id = folder_id === '' || folder_id === 'null' ? null : folder_id;
    if (status) filters.status = status;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);
    const list = await sopsService.list(filters);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sop = await sopsService.getById(req.params.id);
    if (!sop) return res.status(404).json({ success: false, error: 'Not found' });
    const breadcrumb = await sopsService.getBreadcrumb(sop);
    res.json({ success: true, data: parseJsonFields(sop), breadcrumb });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const isTop = req.sopUser && req.sopUser.user_type === 'top';
    const created_by = req.sopUser ? req.sopUser.id : null;
    const body = { ...req.body };
    if (!isTop) {
      body.status = 'draft';
      body.submitted_by = created_by;
    }
    const id = await sopsService.create(body, created_by);
    const sop = await sopsService.getById(id);
    await sopsService.addVersion(sop.id, created_by, 'Created by ' + created_by, sop);
    res.status(201).json({ success: true, data: parseJsonFields(sop) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const isTop = req.sopUser && req.sopUser.user_type === 'top';
    const updated_by = req.sopUser ? req.sopUser.id : null;
    const body = { ...req.body };
    if (!isTop) {
      body.status = 'draft';
      body.submitted_by = updated_by;
    }
    const prev = await sopsService.getById(req.params.id);
    const sop = await sopsService.update(req.params.id, body, updated_by);
    if (!sop) return res.status(404).json({ success: false, error: 'Not found' });
    const changeSummary = prev ? `Changed from: ${prev.status}, to: ${sop.status} by ${updated_by}` : null;
    await sopsService.addVersion(sop.id, updated_by, changeSummary, sop);
    res.json({ success: true, data: parseJsonFields(sop) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const list = await sopsService.getVersions(req.params.id, req.query.limit ? parseInt(req.query.limit, 10) : 50);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

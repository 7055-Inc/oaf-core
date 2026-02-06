/**
 * SOP Folders Routes
 * CRUD operations for SOP folder hierarchy
 */

const express = require('express');
const { foldersService } = require('../services');
const { requireTop } = require('../middleware');

const router = express.Router();

/**
 * GET /api/v2/sop/folders
 * List all folders (as tree or flat list)
 * Query params: flat=1 for flat list
 */
router.get('/', async (req, res) => {
  try {
    const tree = req.query.flat === '1' 
      ? await foldersService.listFlat() 
      : await foldersService.getTree();
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v2/sop/folders/:id
 * Get a specific folder
 */
router.get('/:id', async (req, res) => {
  try {
    const folder = await foldersService.getById(req.params.id);
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v2/sop/folders
 * Create a new folder (requires top access)
 */
router.post('/', requireTop, async (req, res) => {
  try {
    const { title, parent_id } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'title required' });
    }
    const created_by = req.sopUser ? req.sopUser.id : null;
    const id = await foldersService.create({
      title,
      parent_id: parent_id || null,
      created_by,
    });
    const folder = await foldersService.getById(id);
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v2/sop/folders/:id
 * Update a folder (requires top access)
 */
router.put('/:id', requireTop, async (req, res) => {
  try {
    const { title, parent_id } = req.body;
    const updated_by = req.sopUser ? req.sopUser.id : null;
    const folder = await foldersService.update(
      req.params.id,
      { title, parent_id },
      updated_by
    );
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v2/sop/folders/:id
 * Delete a folder (requires top access)
 */
router.delete('/:id', requireTop, async (req, res) => {
  try {
    const ok = await foldersService.remove(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

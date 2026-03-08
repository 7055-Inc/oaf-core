const express = require('express');
const usersService = require('../services/users');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await usersService.list();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await usersService.getById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, brakebee_user_id, user_type } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email required' });
    const id = await usersService.create({ email, brakebee_user_id, user_type: user_type || 'frontline' });
    const user = await usersService.getById(id);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { user_type } = req.body;
    const user = await usersService.update(req.params.id, { user_type });
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = await usersService.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

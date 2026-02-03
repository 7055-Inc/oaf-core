const express = require('express');
const { requireSopAuth, requireTop } = require('../middleware/brakebeeAuth');
const auth = require('./auth');
const users = require('./users');
const folders = require('./folders');
const sops = require('./sops');
const layout = require('./layout');

const router = express.Router();

router.use('/auth', auth);
router.use(requireSopAuth);
router.use('/users', requireTop, users);
router.use('/folders', folders);
router.use('/sops', sops);
router.use('/layout', layout);

module.exports = router;

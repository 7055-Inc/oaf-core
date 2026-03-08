/**
 * SOP Routes Index
 * Main router that combines all SOP sub-routes
 */

const express = require('express');
const { requireSopAuth, requireTop } = require('../middleware');

const authRoutes = require('./auth');
const usersRoutes = require('./users');
const foldersRoutes = require('./folders');
const sopsRoutes = require('./sops');
const layoutRoutes = require('./layout');

const router = express.Router();

// Auth routes (public - handles its own auth)
router.use('/auth', authRoutes);

// All other routes require SOP authentication
router.use(requireSopAuth);

// Users management requires top access
router.use('/users', requireTop, usersRoutes);

// Folders, SOPs, and layout
router.use('/folders', foldersRoutes);
router.use('/sops', sopsRoutes);
router.use('/layout', layoutRoutes);

module.exports = router;

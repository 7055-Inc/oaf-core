/**
 * Addon Connector Subscription Routes
 * Mounted at /api/v2/addons
 *
 * Provides the endpoints ChecklistController expects:
 *   GET  /connectors/:addonSlug/subscription/my
 *   POST /connectors/:addonSlug/subscription/select-tier
 *   GET  /connectors/:addonSlug/subscription/terms-check
 *   POST /connectors/:addonSlug/subscription/terms-accept
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/middleware');
const subscriptionService = require('./services/subscription');

function handleError(res, err) {
  const status = err.statusCode || 500;
  console.error(`Addon route error [${status}]:`, err.message);
  res.status(status).json({ success: false, error: err.message });
}

// GET /connectors/:addonSlug/subscription/my
router.get('/connectors/:addonSlug/subscription/my', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getMySubscription(req.userId, req.params.addonSlug);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /connectors/:addonSlug/subscription/select-tier
router.post('/connectors/:addonSlug/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.selectTier(req.userId, req.params.addonSlug);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /connectors/:addonSlug/subscription/terms-check
router.get('/connectors/:addonSlug/subscription/terms-check', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getTermsCheck(req.userId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /connectors/:addonSlug/subscription/terms-accept
router.post('/connectors/:addonSlug/subscription/terms-accept', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.acceptTerms(req.userId, req.body.terms_version_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;

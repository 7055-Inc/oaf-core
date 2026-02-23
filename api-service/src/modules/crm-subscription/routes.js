/**
 * CRM Subscription Routes
 * Mounted at /api/v2/crm-subscription
 * 
 * Handles tier selection, terms acceptance, card management
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/middleware');
const subscriptionService = require('./services/subscription');
const addonService = require('./services/addons');

function handleError(res, err) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json(status === 500 ? { success: false, error: message } : { error: message });
}

// ============================================================================
// SUBSCRIPTION ROUTES
// ============================================================================

// Get my subscription status
router.get('/subscription/my', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getMySubscription(req.userId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Select tier (step 1 of subscription flow)
router.post('/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.selectTier(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Get terms check
router.get('/subscription/terms-check', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getTermsCheck(req.userId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Accept terms (step 2 of subscription flow)
// Both routes point to the same handler (ChecklistController uses terms-accept)
router.post('/subscription/accept-terms', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.acceptTerms(req.userId, req.body.terms_version_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});
router.post('/subscription/terms-accept', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.acceptTerms(req.userId, req.body.terms_version_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Change tier (for active subscriptions)
router.post('/subscription/change-tier', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.changeTier(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Cancel subscription
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.userId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// ADDON ROUTES
// ============================================================================

// Get my CRM addons
router.get('/addons/my', requireAuth, async (req, res) => {
  try {
    const data = await addonService.getMyAddons(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
});

// Purchase extra drip campaign
router.post('/addons/extra-drip', requireAuth, async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const result = await addonService.purchaseExtraDripCampaign(req.userId, quantity);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Remove extra drip campaign
router.delete('/addons/extra-drip/:addonId', requireAuth, async (req, res) => {
  try {
    const result = await addonService.removeExtraDripCampaign(req.userId, parseInt(req.params.addonId));
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Purchase blast credits (Free tier)
router.post('/addons/blast-credits', requireAuth, async (req, res) => {
  try {
    const { credits = 1 } = req.body;
    const result = await addonService.purchaseBlastCredits(req.userId, credits);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Confirm blast credit purchase (webhook endpoint)
router.post('/webhooks/blast-credits/confirm', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    const result = await addonService.confirmBlastCreditPurchase(payment_intent_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// GET /shipping-policies/default - Public endpoint for default shipping policy
router.get('/shipping-policies/default', async (req, res) => {
  try {
    const [policies] = await db.query(
      'SELECT policy_text FROM shipping_policies WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({ 
        error: 'Default shipping policy not found',
        policy_text: 'Default shipping policy is currently unavailable. Please contact support@brakebee.com for assistance.'
      });
    }

    res.json({ policy_text: policies[0].policy_text });
  } catch (error) {
    console.error('Error fetching default shipping policy:', error);
    res.status(500).json({ error: 'Failed to fetch shipping policy' });
  }
});

// GET /return-policies/default - Public endpoint for default return policy
router.get('/return-policies/default', async (req, res) => {
  try {
    const [policies] = await db.query(
      'SELECT policy_text FROM return_policies WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({ 
        error: 'Default return policy not found',
        policy_text: 'Default return policy is currently unavailable. Please contact support@brakebee.com for assistance.'
      });
    }

    res.json({ policy_text: policies[0].policy_text });
  } catch (error) {
    console.error('Error fetching default return policy:', error);
    res.status(500).json({ error: 'Failed to fetch return policy' });
  }
});

// GET /privacy-policies/default - Public endpoint for default privacy policy
router.get('/privacy-policies/default', async (req, res) => {
  try {
    const [policies] = await db.query(
      'SELECT policy_text FROM privacy_policies WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({ 
        error: 'Default privacy policy not found',
        policy_text: 'Default privacy policy is currently unavailable. Please contact support@brakebee.com for assistance.'
      });
    }

    res.json({ policy_text: policies[0].policy_text });
  } catch (error) {
    console.error('Error fetching default privacy policy:', error);
    res.status(500).json({ error: 'Failed to fetch privacy policy' });
  }
});

// GET /cookie-policies/default - Public endpoint for default cookie policy
router.get('/cookie-policies/default', async (req, res) => {
  try {
    const [policies] = await db.query(
      'SELECT policy_text FROM cookie_policies WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({ 
        error: 'Default cookie policy not found',
        policy_text: 'Default cookie policy is currently unavailable. Please contact support@brakebee.com for assistance.'
      });
    }

    res.json({ policy_text: policies[0].policy_text });
  } catch (error) {
    console.error('Error fetching default cookie policy:', error);
    res.status(500).json({ error: 'Failed to fetch cookie policy' });
  }
});

// GET /copyright-policies/default - Public endpoint for default copyright policy
router.get('/copyright-policies/default', async (req, res) => {
  try {
    const [policies] = await db.query(
      'SELECT policy_text FROM copyright_policies WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({ 
        error: 'Default copyright policy not found',
        policy_text: 'Default copyright policy is currently unavailable. Please contact support@brakebee.com for assistance.'
      });
    }

    res.json({ policy_text: policies[0].policy_text });
  } catch (error) {
    console.error('Error fetching default copyright policy:', error);
    res.status(500).json({ error: 'Failed to fetch copyright policy' });
  }
});

module.exports = router;


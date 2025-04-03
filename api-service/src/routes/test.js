const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// GET /api/v1/test - Get current test state
router.get('/', testController.getTestState);

// PUT /api/v1/test - Update test state
router.put('/', testController.updateTestState);

module.exports = router; 
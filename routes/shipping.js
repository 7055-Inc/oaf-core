require('dotenv').config();
const express = require('express');
const router = express.Router();
const shippingService = require('../services/shippingService');

// Endpoint to get static available shipping services
router.get('/services', async (req, res) => {
    try {
        const services = await shippingService.getAvailableServices();
        res.json({
            services: services.map(service => ({
                provider: service.provider,
                service: service.service,
                code: service.code
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for dynamic shipping options with multi-package support
router.post('/options', async (req, res) => {
    try {
        const packages = Array.isArray(req.body) ? req.body : [req.body];
        if (!packages.length) {
            return res.status(400).json({ error: 'No package data provided' });
        }
        const services = await shippingService.getShippingOptions(packages);
        res.json({
            services: services.map(service => ({
                provider: service.provider,
                service: service.service,
                code: service.code
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
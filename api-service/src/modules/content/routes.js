/**
 * Content Module Routes
 * Mounts legacy articles router at /articles for v2 path: /api/v2/content/articles/*
 */

const express = require('express');
const router = express.Router();
const legacyArticlesRouter = require('../../routes/articles');

router.use('/articles', legacyArticlesRouter);

module.exports = router;

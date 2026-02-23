/**
 * Content Module Routes
 * V2 articles, reviews — proper implementations replacing legacy router
 */

const express = require('express');
const router = express.Router();

router.use('/articles', require('./routesArticles'));
router.use('/reviews', require('./routesReviews'));

module.exports = router;

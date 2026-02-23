/**
 * Media Module Routes (v2)
 * Base path: /api/v2/media (or /api/media for backward compatibility)
 *
 * Worker endpoints (require API key: Bearer MAIN_API_KEY or publicKey:privateKey):
 *   GET  /pending           - Pending images (paginated)
 *   GET  /pending/all       - All pending images
 *   GET  /download/:id      - Download temp file for processing
 *   POST /complete/:id     - Mark image processed (body: { media_id })
 *   DELETE /cleanup/:id    - Mark image failed
 *   GET  /event/:id        - Event context
 *   GET  /product/:id     - Product context (?include=...)
 *   GET  /user/:id        - User context
 *   GET  /analysis/:mediaId - AI analysis (proxies to media backend)
 *
 * Public proxy (no auth):
 *   GET  /serve/*         - Proxy to media backend files
 *   HEAD /serve/*         - Head for files
 *   GET  /images/:mediaId - Smart serving (?size=...)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const { secureLogger } = require('../../middleware/secureLogger');
const { requireMediaAuth } = require('./middleware');
const pendingService = require('./services').pending;
const workerService = require('./services').worker;
const contextService = require('./services').context;
const analysisService = require('./services').analysis;
const routesProxy = require('./routesProxy');

const SMART_MEDIA_BASE_URL = process.env.SMART_MEDIA_BASE_URL || (process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/v2/media/images` : 'https://api.brakebee.com/api/v2/media/images');

// ========== Worker routes (API key auth) ==========
router.get('/pending', requireMediaAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = await pendingService.getPendingPaginated(limit, offset);
    secureLogger.info('Media pending images fetched', { count: result.images.length, total: result.total, requestedBy: req.userId });
    res.json({
      images: result.images,
      pagination: { total: result.total, limit: result.limit, offset: result.offset, hasMore: result.hasMore }
    });
  } catch (error) {
    secureLogger.error('Error fetching pending images', error);
    res.status(500).json({ error: 'Failed to fetch pending images', details: error.message });
  }
});

router.get('/pending/all', requireMediaAuth, async (req, res) => {
  try {
    const result = await pendingService.getPendingAll();
    secureLogger.info('All pending images fetched', { count: result.images.length, requestedBy: req.userId });
    res.json({ images: result.images, total: result.total });
  } catch (error) {
    secureLogger.error('Error fetching all pending images', error);
    res.status(500).json({ error: 'Failed to fetch all pending images', details: error.message });
  }
});

router.get('/download/:id', requireMediaAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await workerService.getImageForDownload(imageId);
    if (!image) return res.status(404).json({ error: 'Image not found or not in pending status' });
    const fullPath = workerService.resolveFullPath(image.image_path);
    if (!workerService.fs.existsSync(fullPath)) {
      await workerService.markFailed(imageId);
      return res.status(404).json({ error: 'Image file not found on disk' });
    }
    const filename = image.original_name || image.image_path.split('/').pop() || 'download';
    res.setHeader('Content-Type', image.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Image-ID', imageId);
    res.setHeader('X-User-ID', image.user_id);
    res.setHeader('X-Created-At', image.created_at);
    fs.createReadStream(fullPath).pipe(res);
    secureLogger.info('Image downloaded', { imageId, imagePath: image.image_path, requestedBy: req.userId });
  } catch (error) {
    secureLogger.error('Error in download endpoint', error);
    res.status(500).json({ error: 'Failed to download image', details: error.message });
  }
});

router.post('/complete/:id', requireMediaAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const { media_id } = req.body;
    if (!media_id) return res.status(400).json({ error: 'media_id is required' });
    if (!/^\d+$/.test(String(media_id))) return res.status(400).json({ error: 'media_id must be numeric' });
    const updated = await workerService.markProcessed(imageId, media_id);
    if (!updated) return res.status(404).json({ error: 'Image not found or not in pending status' });
    const smartUrl = `${SMART_MEDIA_BASE_URL}/${media_id}`;
    secureLogger.info('Image processing completed', { imageId, mediaId: media_id, requestedBy: req.userId });
    res.json({
      success: true,
      imageId,
      media_id,
      status: 'complete',
      smart_url_preview: smartUrl,
      message: 'Image processed, temp file cleaned up, serving via smart URL'
    });
  } catch (error) {
    secureLogger.error('Error completing image processing', error);
    res.status(500).json({ error: 'Failed to complete image processing', details: error.message });
  }
});

router.delete('/cleanup/:id', requireMediaAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await workerService.getImageForCleanup(imageId);
    if (!image) return res.status(404).json({ error: 'Image not found' });
    secureLogger.info('Image marked as failed, temp file preserved as fallback', { imageId, imagePath: image.image_path });
    await workerService.markFailed(imageId);
    secureLogger.info('Image cleanup completed', { imageId, requestedBy: req.userId });
    res.json({ success: true, imageId, status: 'failed', message: 'Temporary file deleted and marked as failed' });
  } catch (error) {
    secureLogger.error('Error in cleanup endpoint', error);
    res.status(500).json({ error: 'Failed to cleanup image', details: error.message });
  }
});

router.get('/event/:id', requireMediaAuth, async (req, res) => {
  try {
    const event = await contextService.getEventContext(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    secureLogger.info('Event context fetched for media processing', { eventId: req.params.id, requestedBy: req.userId });
    res.json(event);
  } catch (error) {
    secureLogger.error('Error fetching event context', { error: error.message, eventId: req.params.id });
    res.status(500).json({ error: 'Failed to get event', details: error.message });
  }
});

router.get('/product/:id', requireMediaAuth, async (req, res) => {
  try {
    const include = req.query.include;
    const product = await contextService.getProductContext(req.params.id, include);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    secureLogger.info('Product context fetched for media processing', { productId: req.params.id, requestedBy: req.userId });
    res.json(product);
  } catch (error) {
    secureLogger.error('Error fetching product context', { error: error.message, productId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.get('/user/:id', requireMediaAuth, async (req, res) => {
  try {
    const user = await contextService.getUserContext(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found or profile not active' });
    secureLogger.info('User context fetched for media processing', { userId: req.params.id, requestedBy: req.userId });
    res.json(user);
  } catch (error) {
    secureLogger.error('Error fetching user context', { error: error.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.get('/analysis/:mediaId', requireMediaAuth, async (req, res) => {
  try {
    const { mediaId } = req.params;
    if (!mediaId || !/^\d+$/.test(mediaId)) return res.status(400).json({ error: 'Valid media ID is required' });
    const { status, data } = await analysisService.fetchAnalysisFromBackend(mediaId);
    if (status === 404) return res.status(404).json({ error: 'AI analysis not found for this media' });
    if (status >= 400) return res.status(status).json({ error: 'Failed to fetch AI analysis from processing VM' });
    secureLogger.info('AI analysis fetched', { mediaId, requestedBy: req.userId });
    res.json({ success: true, analysis: data });
  } catch (error) {
    secureLogger.error('Error fetching AI analysis', error);
    if (error.code === 'CONFIG_MISSING') return res.status(503).json({ error: 'Media API not configured', message: error.message });
    if (error.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Processing VM unavailable' });
    res.status(500).json({ error: 'Failed to fetch AI analysis', details: error.message });
  }
});

// ========== Public proxy (no auth) ==========
router.use(routesProxy);

module.exports = router;

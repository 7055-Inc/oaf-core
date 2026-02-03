/**
 * Media module - Public proxy routes (serve, images) (v2)
 * No authentication. Proxies to media backend for file/smart serving.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { secureLogger } = require('../../middleware/secureLogger');

const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = process.env.MEDIA_API_KEY || '';

router.get('/serve/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return res.status(400).json({ error: 'File path is required' });
    secureLogger.info('Media proxy request', { filePath, ip: req.ip });
    const mediaResponse = await axios.get(`${MEDIA_BACKEND_URL}/files/${filePath}`, {
      headers: { Authorization: MEDIA_API_KEY },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status < 500
    });
    if (mediaResponse.status === 404) return res.status(404).json({ error: 'Media not found' });
    if (mediaResponse.status >= 400) return res.status(mediaResponse.status).json({ error: `Media backend error: ${mediaResponse.statusText}` });
    const ct = mediaResponse.headers['content-type'] || 'application/octet-stream';
    res.set({ 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600, immutable', 'X-Content-Type-Options': 'nosniff' });
    if (mediaResponse.headers['content-length']) res.set('Content-Length', mediaResponse.headers['content-length']);
    if (mediaResponse.headers['etag']) res.set('ETag', mediaResponse.headers['etag']);
    if (mediaResponse.headers['last-modified']) res.set('Last-Modified', mediaResponse.headers['last-modified']);
    if (req.get('If-None-Match') === mediaResponse.headers['etag']) return res.status(304).end();
    mediaResponse.data.pipe(res);
    mediaResponse.data.on('error', (err) => { secureLogger.error('Media streaming error', { filePath, error: err.message }); if (!res.headersSent) res.status(500).json({ error: 'Media streaming failed' }); });
  } catch (error) {
    secureLogger.error('Media proxy error', { filePath: req.params[0], error: error.message });
    if (error.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Media backend unavailable' });
    if (error.code === 'ETIMEDOUT') return res.status(504).json({ error: 'Media backend timeout' });
    res.status(500).json({ error: 'Media proxy error' });
  }
});

router.head('/serve/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    if (!filePath) return res.status(400).end();
    const mediaResponse = await axios.head(`${MEDIA_BACKEND_URL}/files/${filePath}`, {
      headers: { Authorization: MEDIA_API_KEY },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    if (mediaResponse.status === 404) return res.status(404).end();
    if (mediaResponse.status >= 400) return res.status(mediaResponse.status).end();
    res.set('Content-Type', mediaResponse.headers['content-type'] || 'application/octet-stream');
    if (mediaResponse.headers['content-length']) res.set('Content-Length', mediaResponse.headers['content-length']);
    if (mediaResponse.headers['etag']) res.set('ETag', mediaResponse.headers['etag']);
    if (mediaResponse.headers['last-modified']) res.set('Last-Modified', mediaResponse.headers['last-modified']);
    res.status(200).end();
  } catch (error) {
    secureLogger.error('Media info error', { filePath: req.params[0], error: error.message });
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return res.status(503).end();
    res.status(500).end();
  }
});

router.get('/images/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { size = 'detail' } = req.query;
    if (!mediaId || !/^\d+$/.test(mediaId)) return res.status(400).json({ error: 'Valid media ID is required' });
    const validSizes = ['thumbnail', 'small', 'grid', 'detail', 'header', 'zoom'];
    if (!validSizes.includes(size)) return res.status(400).json({ error: 'Invalid size parameter', validSizes });
    secureLogger.info('Smart media proxy request', { mediaId, size, ip: req.ip });
    const smartServeUrl = `${MEDIA_BACKEND_URL}/serve/${mediaId}`;
    const queryParams = new URLSearchParams({ size });
    const mediaResponse = await axios.get(`${smartServeUrl}?${queryParams}`, {
      headers: {
        Authorization: MEDIA_API_KEY,
        Accept: req.get('Accept') || 'image/avif,image/webp,image/*,*/*;q=0.8',
        'User-Agent': req.get('User-Agent') || 'Brakebee-MediaProxy/1.0'
      },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status < 500
    });
    if (mediaResponse.status === 404) return res.status(404).json({ error: 'Media not found' });
    if (mediaResponse.status >= 400) return res.status(mediaResponse.status).json({ error: `Media backend error: ${mediaResponse.statusText}` });
    const ct = mediaResponse.headers['content-type'] || 'application/octet-stream';
    const cacheControl = mediaResponse.headers['cache-control'] || 'public, max-age=31536000, immutable';
    res.set({ 'Content-Type': ct, 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff', Vary: 'Accept' });
    if (mediaResponse.headers['content-length']) res.set('Content-Length', mediaResponse.headers['content-length']);
    if (mediaResponse.headers['etag']) res.set('ETag', mediaResponse.headers['etag']);
    if (mediaResponse.headers['last-modified']) res.set('Last-Modified', mediaResponse.headers['last-modified']);
    if (req.get('If-None-Match') === mediaResponse.headers['etag']) return res.status(304).end();
    mediaResponse.data.pipe(res);
    mediaResponse.data.on('error', (err) => { secureLogger.error('Smart media streaming error', { mediaId, error: err.message }); if (!res.headersSent) res.status(500).json({ error: 'Media streaming failed' }); });
  } catch (error) {
    secureLogger.error('Smart media proxy error', { mediaId: req.params.mediaId, error: error.message });
    if (error.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Media backend unavailable' });
    if (error.code === 'ETIMEDOUT') return res.status(504).json({ error: 'Media backend timeout' });
    res.status(500).json({ error: 'Smart media proxy error' });
  }
});

module.exports = router;

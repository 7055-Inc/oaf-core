const express = require('express');
const router = express.Router();
const axios = require('axios');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * @fileoverview Media proxy service routes
 * 
 * Handles media serving and proxy functionality including:
 * - Direct file serving proxy with streaming support
 * - Smart media serving with format negotiation (AVIF, WebP, JPEG)
 * - Automatic image optimization and size variants
 * - HTTP caching with ETag and Last-Modified support
 * - Conditional requests (304 Not Modified) handling
 * - Comprehensive error handling and logging
 * - Media backend authentication and timeout management
 * 
 * This service acts as a proxy between the frontend and the media backend,
 * providing optimized image delivery, format negotiation, and caching.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// Configuration - Update these with your actual media backend details
const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = 'media_20074c47e0d2af1a90b1d9ba1d001648:eb7d555c29ce59c6202f3975b37a45cdc2e7a21eb09c6d684e982ebee5cc9e6a';

/**
 * Media serving proxy endpoint
 * @route GET /api/media/serve/*
 * @access Public (no authentication required)
 * @param {Object} req - Express request object
 * @param {string} req.params[0] - File path after /serve/
 * @param {Object} res - Express response object
 * @returns {Stream} Media file stream with appropriate headers
 * @description Acts as proxy between frontend and media backend, streaming files with caching support
 * @example GET /api/media/serve/user_123/product/img/123_processed.jpg
 */
router.get('/serve/*', async (req, res) => {
  try {
    const filePath = req.params[0]; // Everything after /serve/
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    secureLogger.info('Media proxy request', {
      filePath,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      ip: req.ip
    });
    
    // Fetch from media backend
    const mediaResponse = await axios.get(`${MEDIA_BACKEND_URL}/files/${filePath}`, {
      headers: {
        'Authorization': MEDIA_API_KEY
      },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
    
    // Handle 404 from media backend
    if (mediaResponse.status === 404) {
      secureLogger.warn('Media file not found', { filePath });
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Handle other 4xx errors from media backend
    if (mediaResponse.status >= 400) {
      secureLogger.warn('Media backend error', { 
        filePath, 
        status: mediaResponse.status,
        statusText: mediaResponse.statusText 
      });
      return res.status(mediaResponse.status).json({ 
        error: `Media backend error: ${mediaResponse.statusText}` 
      });
    }
    
    // Copy important headers from media backend
    const contentType = mediaResponse.headers['content-type'] || 'application/octet-stream';
    const contentLength = mediaResponse.headers['content-length'];
    const etag = mediaResponse.headers['etag'];
    const lastModified = mediaResponse.headers['last-modified'];
    
    // Set response headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, immutable', // Cache for 1 hour
      'X-Content-Type-Options': 'nosniff'
    });
    
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }
    
    if (etag) {
      res.set('ETag', etag);
    }
    
    if (lastModified) {
      res.set('Last-Modified', lastModified);
    }
    
    // Handle conditional requests (304 Not Modified)
    if (req.get('If-None-Match') === etag || 
        (req.get('If-Modified-Since') && lastModified && 
         new Date(req.get('If-Modified-Since')) >= new Date(lastModified))) {
      return res.status(304).end();
    }
    
    secureLogger.info('Media proxy success', {
      filePath,
      contentType,
      contentLength,
      cached: !!etag
    });
    
    // Stream the file to frontend
    mediaResponse.data.pipe(res);
    
    // Handle streaming errors
    mediaResponse.data.on('error', (error) => {
      secureLogger.error('Media streaming error', {
        filePath,
        error: error.message
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Media streaming failed' });
      }
    });
    
    // Handle response finish
    res.on('finish', () => {
      secureLogger.info('Media proxy completed', { filePath });
    });
    
  } catch (error) {
    secureLogger.error('Media proxy error', {
      filePath: req.params[0],
      error: error.message,
      stack: error.stack
    });
    
    // Handle specific axios errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Media backend unavailable',
        message: 'The media processing server is currently unavailable. Please try again later.'
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Media backend timeout',
        message: 'The media server took too long to respond. Please try again.'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Media backend authentication failed',
        message: 'Internal authentication error with media server.'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Media proxy error',
      message: 'An unexpected error occurred while fetching the media.'
    });
  }
});

/**
 * Get media file information without downloading
 * @route HEAD /api/media/serve/*
 * @access Public (no authentication required)
 * @param {Object} req - Express request object
 * @param {string} req.params[0] - File path after /serve/
 * @param {Object} res - Express response object
 * @returns {Object} HTTP headers with media metadata (no body)
 * @description Returns metadata about media file without streaming content, useful for existence checks
 */
router.head('/serve/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    
    if (!filePath) {
      return res.status(400).end();
    }
    
    // Send HEAD request to media backend
    const mediaResponse = await axios.head(`${MEDIA_BACKEND_URL}/files/${filePath}`, {
      headers: {
        'Authorization': MEDIA_API_KEY
      },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    if (mediaResponse.status === 404) {
      return res.status(404).end();
    }
    
    if (mediaResponse.status >= 400) {
      return res.status(mediaResponse.status).end();
    }
    
    // Copy headers and return
    const contentType = mediaResponse.headers['content-type'] || 'application/octet-stream';
    const contentLength = mediaResponse.headers['content-length'];
    const etag = mediaResponse.headers['etag'];
    const lastModified = mediaResponse.headers['last-modified'];
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, immutable'
    });
    
    if (contentLength) res.set('Content-Length', contentLength);
    if (etag) res.set('ETag', etag);
    if (lastModified) res.set('Last-Modified', lastModified);
    
    res.status(200).end();
    
  } catch (error) {
    secureLogger.error('Media info error', {
      filePath: req.params[0],
      error: error.message
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).end();
    }
    
    res.status(500).end();
  }
});

/**
 * Smart serving proxy endpoint with format negotiation
 * @route GET /api/media/images/:mediaId
 * @access Public (no authentication required)
 * @param {Object} req - Express request object
 * @param {string} req.params.mediaId - Media ID (numeric)
 * @param {string} req.query.size - Size variant (thumbnail, small, grid, detail, header, zoom)
 * @param {Object} res - Express response object
 * @returns {Stream} Optimized media stream with format negotiation
 * @description Proxies to smart serving system with automatic format negotiation and size optimization
 * @example GET /api/media/images/456?size=thumbnail
 */
router.get('/images/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { size = 'detail' } = req.query; // Default to detail size
    
    if (!mediaId || !/^\d+$/.test(mediaId)) {
      return res.status(400).json({ error: 'Valid media ID is required' });
    }

    // Validate size parameter
    const validSizes = ['thumbnail', 'small', 'grid', 'detail', 'header', 'zoom'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({ 
        error: 'Invalid size parameter',
        validSizes 
      });
    }

    secureLogger.info('Smart media proxy request', {
      mediaId,
      size,
      userAgent: req.get('User-Agent'),
      acceptHeader: req.get('Accept'),
      referer: req.get('Referer'),
      ip: req.ip
    });
    
    // Build URL for smart serving backend
    const smartServeUrl = `${MEDIA_BACKEND_URL}/serve/${mediaId}`;
    const queryParams = new URLSearchParams({ size });
    
    // Fetch from smart serving backend
    const mediaResponse = await axios.get(`${smartServeUrl}?${queryParams}`, {
      headers: {
        'Authorization': MEDIA_API_KEY,
        'Accept': req.get('Accept') || 'image/avif,image/webp,image/*,*/*;q=0.8', // Pass Accept header for format negotiation
        'User-Agent': req.get('User-Agent') || 'Beemeeart-MediaProxy/1.0'
      },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status < 500
    });
    
    // Handle 404 from media backend
    if (mediaResponse.status === 404) {
      secureLogger.warn('Smart media not found', { mediaId, size });
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Handle other 4xx errors from media backend
    if (mediaResponse.status >= 400) {
      secureLogger.warn('Smart media backend error', { 
        mediaId, 
        size,
        status: mediaResponse.status,
        statusText: mediaResponse.statusText 
      });
      return res.status(mediaResponse.status).json({ 
        error: `Media backend error: ${mediaResponse.statusText}` 
      });
    }
    
    // Copy important headers from media backend
    const contentType = mediaResponse.headers['content-type'] || 'application/octet-stream';
    const contentLength = mediaResponse.headers['content-length'];
    const etag = mediaResponse.headers['etag'];
    const lastModified = mediaResponse.headers['last-modified'];
    const cacheControl = mediaResponse.headers['cache-control'] || 'public, max-age=31536000, immutable'; // 1 year default
    
    // Set response headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': cacheControl, // Use backend's cache control or default to 1 year
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Accept' // Important for format negotiation caching
    });
    
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }
    
    if (etag) {
      res.set('ETag', etag);
    }
    
    if (lastModified) {
      res.set('Last-Modified', lastModified);
    }
    
    // Handle conditional requests (304 Not Modified)
    if (req.get('If-None-Match') === etag || 
        (req.get('If-Modified-Since') && lastModified && 
         new Date(req.get('If-Modified-Since')) >= new Date(lastModified))) {
      return res.status(304).end();
    }
    
    secureLogger.info('Smart media proxy success', {
      mediaId,
      size,
      contentType,
      contentLength,
      cacheControl,
      cached: !!etag
    });
    
    // Stream the optimized image to frontend
    mediaResponse.data.pipe(res);
    
    // Handle streaming errors
    mediaResponse.data.on('error', (error) => {
      secureLogger.error('Smart media streaming error', {
        mediaId,
        size,
        error: error.message
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Media streaming failed' });
      }
    });
    
    // Handle response finish
    res.on('finish', () => {
      secureLogger.info('Smart media proxy completed', { mediaId, size });
    });
    
  } catch (error) {
    secureLogger.error('Smart media proxy error', {
      mediaId: req.params.mediaId,
      size: req.query.size,
      error: error.message,
      stack: error.stack
    });
    
    // Handle specific axios errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Media backend unavailable',
        message: 'The media processing server is currently unavailable. Please try again later.'
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Media backend timeout',
        message: 'The media server took too long to respond. Please try again.'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Media backend authentication failed',
        message: 'Internal authentication error with media server.'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Smart media proxy error',
      message: 'An unexpected error occurred while fetching the optimized media.'
    });
  }
});

module.exports = router; 
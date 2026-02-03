/**
 * Media module - Worker operations (download, complete, cleanup) (v2)
 */

const db = require('../../../../config/db');
const path = require('path');
const fs = require('fs');

/** Root of api-service for resolving temp_images (from src/modules/media/services -> api-service) */
const API_SERVICE_ROOT = path.join(__dirname, '../../../../');

function getImageForDownload(imageId) {
  return db.query(
    `SELECT id, user_id, image_path, original_name, mime_type, status, created_at
     FROM pending_images
     WHERE id = ? AND status = 'pending'`,
    [imageId]
  ).then(([rows]) => rows[0] || null);
}

function resolveFullPath(imagePath) {
  return path.join(API_SERVICE_ROOT, imagePath.replace(/^\//, ''));
}

function markFailed(imageId) {
  return db.query(
    'UPDATE pending_images SET status = ? , updated_at = NOW() WHERE id = ?',
    ['failed', imageId]
  );
}

async function markProcessed(imageId, mediaId) {
  const [result] = await db.query(
    `UPDATE pending_images
     SET permanent_url = ?, thumbnail_url = ?, status = ?, updated_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [String(mediaId), String(mediaId), 'processed', imageId]
  );
  return result.affectedRows > 0;
}

async function getImageForCleanup(imageId) {
  const [rows] = await db.query(
    'SELECT id, image_path, status FROM pending_images WHERE id = ?',
    [imageId]
  );
  return rows[0] || null;
}

module.exports = {
  getImageForDownload,
  resolveFullPath,
  markFailed,
  markProcessed,
  getImageForCleanup,
  fs
};

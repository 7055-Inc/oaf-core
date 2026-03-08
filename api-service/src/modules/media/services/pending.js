/**
 * Media module - Pending images service (v2)
 * Fetches pending_images for media processing workers.
 */

const db = require('../../../../config/db');

async function getPendingPaginated(limit = 10, offset = 0) {
  const [images] = await db.query(
    `SELECT id, user_id, image_path, original_name, mime_type, status, created_at, updated_at
     FROM pending_images
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [countResult] = await db.query(
    "SELECT COUNT(*) as total FROM pending_images WHERE status = 'pending'"
  );
  return {
    images,
    total: countResult[0].total,
    limit,
    offset,
    hasMore: offset + images.length < countResult[0].total
  };
}

async function getPendingAll() {
  const [images] = await db.query(
    `SELECT id, user_id, image_path, original_name, mime_type, status, created_at, updated_at
     FROM pending_images
     WHERE status = 'pending'
     ORDER BY created_at ASC`
  );
  return { images, total: images.length };
}

module.exports = {
  getPendingPaginated,
  getPendingAll
};

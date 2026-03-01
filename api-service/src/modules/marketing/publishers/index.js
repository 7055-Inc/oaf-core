/**
 * Publishers Module
 * 
 * Exports all publisher classes and factory method
 */

const BasePublisher = require('./BasePublisher');
const MetaPublisher = require('./MetaPublisher');
const TwitterPublisher = require('./TwitterPublisher');
const TikTokPublisher = require('./TikTokPublisher');
const PinterestPublisher = require('./PinterestPublisher');
const GoogleAdsPublisher = require('./GoogleAdsPublisher');
const BingAdsPublisher = require('./BingAdsPublisher');
const OAuthService = require('../services/OAuthService');
const { decrypt } = require('../../../utils/encryption');

/**
 * Publisher Factory
 * 
 * Gets the appropriate publisher for a given connection
 * @param {object} connection - Connection from social_connections table
 * @returns {BasePublisher} - Publisher instance
 */
async function getPublisher(connection) {
  // If connection is just an ID, fetch the full connection
  if (typeof connection === 'number' || typeof connection === 'string') {
    const result = await OAuthService.getConnection(connection);
    if (!result.success) {
      throw new Error(`Connection not found: ${connection}`);
    }
    connection = result.connection;
  }

  // Check if token is expired and needs refresh
  const tempPublisher = new BasePublisher(connection);
  if (tempPublisher.isTokenExpired()) {
    console.log(`Token for connection ${connection.id} is expired, refreshing...`);
    const refreshResult = await OAuthService.refreshToken(connection.id);
    
    if (refreshResult.success) {
      // Fetch updated connection
      const updatedResult = await OAuthService.getConnection(connection.id);
      if (updatedResult.success) {
        connection = updatedResult.connection;
      }
    } else {
      console.warn(`Failed to refresh token for connection ${connection.id}: ${refreshResult.error}`);
    }
  }

  // Return appropriate publisher based on platform
  switch (connection.platform.toLowerCase()) {
    case 'facebook':
    case 'instagram':
      return new MetaPublisher(connection);

    case 'twitter':
    case 'x':
      return new TwitterPublisher(connection);

    case 'tiktok':
      return new TikTokPublisher(connection);

    case 'pinterest':
      return new PinterestPublisher(connection);

    case 'google':
      return new GoogleAdsPublisher(connection);

    case 'bing':
      return new BingAdsPublisher(connection);

    default:
      throw new Error(`Unsupported platform: ${connection.platform}`);
  }
}

/**
 * Get publisher for a specific content item
 * Fetches the appropriate connection and returns publisher
 * 
 * @param {object} content - Content from marketing_content table
 * @param {string} ownerType - 'admin' or 'user'
 * @param {number} ownerId - Owner ID
 * @returns {Promise<BasePublisher>} - Publisher instance
 */
async function getPublisherForContent(content, ownerType, ownerId) {
  const db = require('../../../../config/db');

  // Get active connection for this channel
  const [connections] = await db.execute(
    `SELECT * FROM social_connections 
     WHERE owner_type = ? 
       AND owner_id = ? 
       AND platform = ? 
       AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [ownerType, ownerId, content.channel]
  );

  if (connections.length === 0) {
    throw new Error(`No active connection found for ${content.channel}`);
  }

  const connection = connections[0];

  // Decrypt tokens
  if (connection.access_token) connection.access_token = decrypt(connection.access_token);
  if (connection.refresh_token) connection.refresh_token = decrypt(connection.refresh_token);

  // Parse JSON permissions
  if (connection.permissions && typeof connection.permissions === 'string') {
    connection.permissions = JSON.parse(connection.permissions);
  }

  return await getPublisher(connection);
}

/**
 * Publish content to platform
 * High-level helper that handles all the steps
 * 
 * @param {number} contentId - Content ID from marketing_content table
 * @returns {Promise<object>} - { success, externalId, error }
 */
async function publishContent(contentId) {
  const db = require('../../../../config/db');

  try {
    // Get content details
    const [contents] = await db.execute(
      `SELECT mc.*, mcamp.owner_type, mcamp.owner_id
       FROM marketing_content mc
       JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
       WHERE mc.id = ?`,
      [contentId]
    );

    if (contents.length === 0) {
      return {
        success: false,
        error: 'Content not found'
      };
    }

    const content = contents[0];

    // Parse content JSON
    const contentData = typeof content.content === 'string' 
      ? JSON.parse(content.content) 
      : content.content;

    // Get publisher
    const publisher = await getPublisherForContent(
      content,
      content.owner_type,
      content.owner_id
    );

    // Publish
    const result = await publisher.publish(content, contentData);

    if (result.success) {
      // Update database
      await db.execute(
        `UPDATE marketing_content 
         SET status = 'published',
             published_at = NOW(),
             external_id = ?
         WHERE id = ?`,
        [result.externalId, contentId]
      );

      // Log success feedback
      await db.execute(
        `INSERT INTO marketing_feedback 
         (content_id, action, feedback, created_by)
         VALUES (?, 'comment', ?, 0)`,
        [contentId, `Published successfully to ${content.channel}`]
      );
    } else {
      // Update to failed status
      await db.execute(
        `UPDATE marketing_content 
         SET status = 'failed'
         WHERE id = ?`,
        [contentId]
      );

      // Log failure
      await db.execute(
        `INSERT INTO marketing_feedback 
         (content_id, action, feedback, created_by)
         VALUES (?, 'comment', ?, 0)`,
        [contentId, `Publishing failed: ${result.error}`]
      );
    }

    return result;
  } catch (error) {
    console.error('Publish content error:', error);
    
    // Update to failed status
    try {
      await db.execute(
        `UPDATE marketing_content 
         SET status = 'failed'
         WHERE id = ?`,
        [contentId]
      );

      await db.execute(
        `INSERT INTO marketing_feedback 
         (content_id, action, feedback, created_by)
         VALUES (?, 'comment', ?, 0)`,
        [contentId, `Publishing error: ${error.message}`]
      );
    } catch (dbError) {
      console.error('Error updating failure status:', dbError);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  BasePublisher,
  MetaPublisher,
  TwitterPublisher,
  TikTokPublisher,
  PinterestPublisher,
  GoogleAdsPublisher,
  BingAdsPublisher,
  getPublisher,
  getPublisherForContent,
  publishContent
};

/**
 * User Preferences - Load User Truths (Classification 141)
 * 
 * Loads pre-calculated user preferences from classification 141 documents
 * Provides caching and fallback to global trends
 */

const { getGlobalTrends, hasEnoughPersonalData, blendWithGlobalTrends } = require('./globalTrends');
const logger = require('../logger');

// In-memory cache for user preferences
const userPrefCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

/**
 * Get user preferences from classification 141
 * With caching and fallback to global trends
 */
async function getUserPreferences(userId, vectorDB) {
  if (!userId || userId === 'anonymous') {
    logger.info('Anonymous user - using global trends');
    return getGlobalTrends();
  }
  
  // Check cache first
  const cached = userPrefCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    logger.info(`User ${userId} preferences loaded from cache`);
    return cached.data;
  }
  
  try {
    // Load from vector database (classification 141)
    const collection = vectorDB.collections.get('user_profiles');
    if (!collection) {
      logger.warn('user_profiles collection not found');
      return getGlobalTrends();
    }
    
    const userDoc = await collection.get({ ids: [`user_${userId}`] });
    
    if (!userDoc || !userDoc.ids || userDoc.ids.length === 0) {
      logger.info(`User ${userId} not found, using global trends`);
      return getGlobalTrends();
    }
    
    const metadata = userDoc.metadatas[0];
    
    if (metadata.classification !== '141') {
      logger.warn(`User ${userId} document has wrong classification: ${metadata.classification}`);
      return getGlobalTrends();
    }
    
    const userPrefs = parseUserMetadata(metadata);
    
    if (!hasEnoughPersonalData(userPrefs)) {
      logger.info(`User ${userId} has limited data, blending with global trends`);
      const dataPoints = userPrefs.data_points || 0;
      const userWeight = Math.min(dataPoints / 50, 0.7);
      const blended = blendWithGlobalTrends(userPrefs, userWeight);
      
      userPrefCache.set(userId, {
        data: blended,
        timestamp: Date.now()
      });
      
      return blended;
    }
    
    userPrefCache.set(userId, {
      data: userPrefs,
      timestamp: Date.now()
    });
    
    logger.info(`User ${userId} preferences loaded successfully`, {
      confidence: userPrefs.confidence,
      data_points: userPrefs.data_points
    });
    
    return userPrefs;
    
  } catch (error) {
    logger.error(`Error loading preferences for user ${userId}:`, error);
    return getGlobalTrends();
  }
}

/**
 * Parse user metadata from classification 141 document
 */
function parseUserMetadata(metadata) {
  const colorPrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('color_preference_'))
    .forEach(key => {
      const color = key.replace('color_preference_', '');
      colorPrefs[color] = metadata[key];
    });
  
  const stylePrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('style_preference_'))
    .forEach(key => {
      const style = key.replace('style_preference_', '');
      stylePrefs[style] = metadata[key];
    });
  
  const mediumPrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('medium_preference_'))
    .forEach(key => {
      const medium = key.replace('medium_preference_', '');
      mediumPrefs[medium] = metadata[key];
    });
  
  const categoryPrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('category_preference_'))
    .forEach(key => {
      const category = key.replace('category_preference_', '');
      categoryPrefs[category] = metadata[key];
    });
  
  return {
    user_id: metadata.user_id,
    classification: metadata.classification,
    color_preferences: colorPrefs,
    style_preferences: stylePrefs,
    medium_preferences: mediumPrefs,
    category_preferences: categoryPrefs,
    price_sweet_spot: metadata.price_sweet_spot || 350,
    price_max: metadata.price_max || 500,
    avg_order_value: metadata.avg_order_value,
    favorite_artist_ids: metadata.favorite_artist_ids 
      ? metadata.favorite_artist_ids.split(',').map(id => parseInt(id))
      : [],
    data_points: metadata.data_points || 0,
    confidence: metadata.confidence || 0.3,
    last_updated: metadata.last_updated,
    data_source: 'user_profile',
    cached: false
  };
}

function clearUserCache(userId) {
  userPrefCache.delete(userId);
  logger.info(`Cache cleared for user ${userId}`);
}

function clearAllCache() {
  const count = userPrefCache.size;
  userPrefCache.clear();
  logger.info(`Cleared ${count} cached user preferences`);
}

function getCacheStats() {
  return {
    cached_users: userPrefCache.size,
    ttl_ms: CACHE_TTL,
    entries: Array.from(userPrefCache.keys())
  };
}

module.exports = {
  getUserPreferences,
  clearUserCache,
  clearAllCache,
  getCacheStats,
  parseUserMetadata
};

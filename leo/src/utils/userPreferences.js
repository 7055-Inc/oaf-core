/**
 * User Preferences - Load User Truths (Classification 141)
 * 
 * Loads pre-calculated user preferences from classification 141 documents
 * Provides caching and fallback to global trends
 * 
 * This is the "file cabinet" that makes Leo feel instant and psychic!
 */

const { getGlobalTrends, hasEnoughPersonalData, blendWithGlobalTrends } = require('./globalTrends');
const logger = require('./logger');

// In-memory cache for user preferences (Production: use Redis)
const userPrefCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

/**
 * Get user preferences from classification 141
 * With caching and fallback to global trends
 * 
 * @param {number|string} userId - User ID
 * @param {Object} vectorDB - VectorDatabase instance
 * @returns {Promise<Object>} User preferences or global trends
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
    const userDoc = await vectorDB.collections.get('user_profiles')
      .get({ ids: [`user_${userId}`] });
    
    if (!userDoc || !userDoc.ids || userDoc.ids.length === 0) {
      logger.info(`User ${userId} not found, using global trends`);
      return getGlobalTrends();
    }
    
    const metadata = userDoc.metadatas[0];
    
    // Check if classification is correct
    if (metadata.classification !== '141') {
      logger.warn(`User ${userId} document has wrong classification: ${metadata.classification}`);
      return getGlobalTrends();
    }
    
    // Parse preferences from metadata
    const userPrefs = parseUserMetadata(metadata);
    
    // If user doesn't have enough data, blend with global trends
    if (!hasEnoughPersonalData(userPrefs)) {
      logger.info(`User ${userId} has limited data, blending with global trends`);
      const dataPoints = userPrefs.data_points || 0;
      const userWeight = Math.min(dataPoints / 50, 0.7);  // Max 70% user, increase as data grows
      const blended = blendWithGlobalTrends(userPrefs, userWeight);
      
      // Cache the blended result
      userPrefCache.set(userId, {
        data: blended,
        timestamp: Date.now()
      });
      
      return blended;
    }
    
    // Cache the result
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
 * Converts flat metadata into structured preferences
 * 
 * @param {Object} metadata - User document metadata
 * @returns {Object} Structured preferences
 */
function parseUserMetadata(metadata) {
  // Extract color preferences (stored as color_preference_blue, etc.)
  const colorPrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('color_preference_'))
    .forEach(key => {
      const color = key.replace('color_preference_', '');
      colorPrefs[color] = metadata[key];
    });
  
  // Extract style preferences
  const stylePrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('style_preference_'))
    .forEach(key => {
      const style = key.replace('style_preference_', '');
      stylePrefs[style] = metadata[key];
    });
  
  // Extract medium preferences
  const mediumPrefs = {};
  Object.keys(metadata)
    .filter(key => key.startsWith('medium_preference_'))
    .forEach(key => {
      const medium = key.replace('medium_preference_', '');
      mediumPrefs[medium] = metadata[key];
    });
  
  // Extract category preferences
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
    
    // Preferences
    color_preferences: colorPrefs,
    style_preferences: stylePrefs,
    medium_preferences: mediumPrefs,
    category_preferences: categoryPrefs,
    
    // Price behavior
    price_sweet_spot: metadata.price_sweet_spot || 350,
    price_max: metadata.price_max || 500,
    avg_order_value: metadata.avg_order_value,
    
    // Artist preferences
    favorite_artist_ids: metadata.favorite_artist_ids 
      ? metadata.favorite_artist_ids.split(',').map(id => parseInt(id))
      : [],
    
    // Temporal patterns
    shops_on_weekends: metadata.shops_on_weekends,
    evening_shopper: metadata.evening_shopper,
    
    // Confidence metrics
    data_points: metadata.data_points || 0,
    confidence: metadata.confidence || 0.3,
    last_updated: metadata.last_updated,
    
    // Metadata
    data_source: 'user_profile',
    cached: false
  };
}

/**
 * Update session cache with real-time interaction
 * For instant feel without waiting for nightly batch
 * 
 * @param {number} userId - User ID
 * @param {Object} interaction - Interaction data (swipe, click, etc.)
 */
function updateSessionCache(userId, interaction) {
  const cached = userPrefCache.get(userId);
  if (!cached) return;  // No cache to update
  
  const sessionPrefs = cached.data;
  
  // Apply small boost based on interaction
  if (interaction.type === 'swipe_right' || interaction.type === 'like') {
    // Boost color preferences
    if (interaction.product_colors) {
      interaction.product_colors.forEach(color => {
        if (!sessionPrefs.color_preferences[color]) {
          sessionPrefs.color_preferences[color] = 0;
        }
        sessionPrefs.color_preferences[color] += 0.05;  // Small session boost
      });
    }
    
    // Boost style preferences
    if (interaction.product_style) {
      if (!sessionPrefs.style_preferences[interaction.product_style]) {
        sessionPrefs.style_preferences[interaction.product_style] = 0;
      }
      sessionPrefs.style_preferences[interaction.product_style] += 0.03;
    }
  }
  
  // Update cache
  userPrefCache.set(userId, {
    data: sessionPrefs,
    timestamp: cached.timestamp  // Keep original timestamp
  });
  
  logger.info(`Session cache updated for user ${userId}`, {
    interaction_type: interaction.type
  });
}

/**
 * Clear cache for a specific user
 * Called after nightly batch update
 * 
 * @param {number} userId - User ID
 */
function clearUserCache(userId) {
  userPrefCache.delete(userId);
  logger.info(`Cache cleared for user ${userId}`);
}

/**
 * Clear all cached preferences
 * Useful for testing or after batch updates
 */
function clearAllCache() {
  const count = userPrefCache.size;
  userPrefCache.clear();
  logger.info(`Cleared ${count} cached user preferences`);
}

/**
 * Get cache statistics
 * For monitoring and debugging
 */
function getCacheStats() {
  return {
    cached_users: userPrefCache.size,
    ttl_ms: CACHE_TTL,
    entries: Array.from(userPrefCache.keys())
  };
}

module.exports = {
  getUserPreferences,
  updateSessionCache,
  clearUserCache,
  clearAllCache,
  getCacheStats,
  parseUserMetadata  // Export for testing
};


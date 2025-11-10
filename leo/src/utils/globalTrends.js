/**
 * Global Trends - Platform-Wide Intelligence Baseline
 * 
 * Provides fallback preferences for anonymous users or new users
 * Based on platform-wide behavior and popularity
 * 
 * Updated weekly by batch job analyzing all user interactions
 */

const logger = require('./logger');

/**
 * Global platform trends (updated weekly)
 * This serves as the baseline for users without enough personal data
 * 
 * In production, this would be loaded from a cache/database
 * and updated by a weekly batch job that analyzes:
 * - All user swipes (classification 132)
 * - All purchases (classification 131)
 * - Product popularity (sales_count, favorite_count)
 */
const GLOBAL_TRENDS = {
  // Last updated timestamp
  last_updated: new Date().toISOString(),
  confidence: 0.75,  // Medium confidence (platform-wide average)
  data_source: 'platform_wide_analysis',
  
  // Color preferences (from all user interactions)
  color_preferences: {
    blue: 0.42,
    green: 0.28,
    red: 0.18,
    yellow: 0.15,
    purple: 0.12,
    orange: 0.10,
    neutral: 0.35  // Grays, whites, blacks
  },
  
  // Style preferences (from purchases and swipes)
  style_preferences: {
    abstract: 0.38,
    modern: 0.32,
    contemporary: 0.28,
    realism: 0.22,
    impressionism: 0.18,
    minimalist: 0.25,
    traditional: 0.15
  },
  
  // Medium preferences
  medium_preferences: {
    painting: 0.55,
    sculpture: 0.28,
    photography: 0.22,
    digital: 0.18,
    mixed_media: 0.15,
    print: 0.20
  },
  
  // Price behavior (platform average)
  price_sensitivity: {
    sweet_spot: 350,      // Most common purchase price
    avg_order_value: 420,
    max_comfortable: 600,  // 80th percentile
    min_threshold: 50
  },
  
  // Category preferences
  category_preferences: {
    'wall_art': 0.45,
    'home_decor': 0.35,
    'sculptures': 0.25,
    'jewelry': 0.15,
    'functional_art': 0.20
  },
  
  // Temporal patterns (when users shop)
  temporal_patterns: {
    weekend_shoppers: 0.62,  // 62% prefer weekends
    evening_shoppers: 0.58,   // 58% shop after 6pm
    lunch_browsers: 0.25      // 25% browse at lunch
  },
  
  // Quality/popularity signals
  popularity_signals: {
    boost_popular_products: 0.15,      // Boost popular items
    boost_new_arrivals: 0.08,          // Small boost for new items
    boost_highly_favorited: 0.10,      // Boost saved/favorited items
    boost_high_rated: 0.12             // Boost highly rated
  },
  
  // Version for cache invalidation
  version: 1
};

/**
 * Get global platform trends
 * Used as fallback for anonymous users or users without enough data
 * 
 * @returns {Object} Global trends object
 */
function getGlobalTrends() {
  logger.info('Loading global trends (platform baseline)');
  return { ...GLOBAL_TRENDS };  // Return copy to prevent mutation
}

/**
 * Check if a user has enough data to skip global trends
 * 
 * @param {Object} userPrefs - User preferences object
 * @returns {boolean} True if user has enough personal data
 */
function hasEnoughPersonalData(userPrefs) {
  if (!userPrefs) return false;
  
  const dataPoints = userPrefs.data_points || 0;
  const confidence = userPrefs.confidence || 0;
  
  // Need at least 20 data points and 0.5 confidence
  return dataPoints >= 20 && confidence >= 0.5;
}

/**
 * Blend user preferences with global trends
 * For users with some data but not enough for full personalization
 * 
 * @param {Object} userPrefs - User's personal preferences
 * @param {number} userWeight - Weight for user prefs (0-1)
 * @returns {Object} Blended preferences
 */
function blendWithGlobalTrends(userPrefs, userWeight = 0.7) {
  const global = getGlobalTrends();
  const globalWeight = 1 - userWeight;
  
  // Blend color preferences
  const blendedColors = {};
  const allColors = new Set([
    ...Object.keys(userPrefs.color_preferences || {}),
    ...Object.keys(global.color_preferences)
  ]);
  
  allColors.forEach(color => {
    const userPref = userPrefs.color_preferences?.[color] || 0;
    const globalPref = global.color_preferences[color] || 0;
    blendedColors[color] = (userPref * userWeight) + (globalPref * globalWeight);
  });
  
  // Blend style preferences
  const blendedStyles = {};
  const allStyles = new Set([
    ...Object.keys(userPrefs.style_preferences || {}),
    ...Object.keys(global.style_preferences)
  ]);
  
  allStyles.forEach(style => {
    const userPref = userPrefs.style_preferences?.[style] || 0;
    const globalPref = global.style_preferences[style] || 0;
    blendedStyles[style] = (userPref * userWeight) + (globalPref * globalWeight);
  });
  
  // Blend price sensitivity
  const blendedPrice = {
    sweet_spot: (userPrefs.price_sweet_spot || global.price_sensitivity.sweet_spot) * userWeight +
                global.price_sensitivity.sweet_spot * globalWeight,
    max_comfortable: userPrefs.price_max || global.price_sensitivity.max_comfortable
  };
  
  return {
    color_preferences: blendedColors,
    style_preferences: blendedStyles,
    price_sensitivity: blendedPrice,
    medium_preferences: userPrefs.medium_preferences || global.medium_preferences,
    confidence: userPrefs.confidence * userWeight + global.confidence * globalWeight,
    data_source: 'blended',
    user_weight: userWeight,
    global_weight: globalWeight
  };
}

/**
 * Update global trends (called by weekly batch job)
 * In production, this would analyze all platform data
 * 
 * @param {Object} newTrends - Updated trends from analysis
 */
async function updateGlobalTrends(newTrends) {
  // In production, this would:
  // 1. Validate the new trends
  // 2. Update cache/database
  // 3. Invalidate distributed caches
  // 4. Log the update
  
  logger.info('Global trends update requested', {
    version: newTrends.version,
    timestamp: new Date().toISOString()
  });
  
  // For now, just log that this would happen
  // Real implementation would update GLOBAL_TRENDS or database
  return true;
}

module.exports = {
  getGlobalTrends,
  hasEnoughPersonalData,
  blendWithGlobalTrends,
  updateGlobalTrends,
  GLOBAL_TRENDS  // Export for testing/debugging
};


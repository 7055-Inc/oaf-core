/**
 * Global Trends - Platform-Wide Intelligence Baseline
 * 
 * Provides fallback preferences for anonymous users or new users
 * Based on platform-wide behavior and popularity
 */

const logger = require('../logger');

/**
 * Global platform trends (baseline for personalization)
 */
const GLOBAL_TRENDS = {
  last_updated: new Date().toISOString(),
  confidence: 0.75,
  data_source: 'platform_wide_analysis',
  
  color_preferences: {
    blue: 0.42,
    green: 0.28,
    red: 0.18,
    yellow: 0.15,
    purple: 0.12,
    orange: 0.10,
    neutral: 0.35
  },
  
  style_preferences: {
    abstract: 0.38,
    modern: 0.32,
    contemporary: 0.28,
    realism: 0.22,
    impressionism: 0.18,
    minimalist: 0.25,
    traditional: 0.15
  },
  
  medium_preferences: {
    painting: 0.55,
    sculpture: 0.28,
    photography: 0.22,
    digital: 0.18,
    mixed_media: 0.15,
    print: 0.20
  },
  
  price_sensitivity: {
    sweet_spot: 350,
    avg_order_value: 420,
    max_comfortable: 600,
    min_threshold: 50
  },
  
  category_preferences: {
    'wall_art': 0.45,
    'home_decor': 0.35,
    'sculptures': 0.25,
    'jewelry': 0.15,
    'functional_art': 0.20
  },
  
  popularity_signals: {
    boost_popular_products: 0.15,
    boost_new_arrivals: 0.08,
    boost_highly_favorited: 0.10,
    boost_high_rated: 0.12
  },
  
  version: 1
};

function getGlobalTrends() {
  return { ...GLOBAL_TRENDS };
}

function hasEnoughPersonalData(userPrefs) {
  if (!userPrefs) return false;
  const dataPoints = userPrefs.data_points || 0;
  const confidence = userPrefs.confidence || 0;
  return dataPoints >= 20 && confidence >= 0.5;
}

function blendWithGlobalTrends(userPrefs, userWeight = 0.7) {
  const global = getGlobalTrends();
  const globalWeight = 1 - userWeight;
  
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

module.exports = {
  getGlobalTrends,
  hasEnoughPersonalData,
  blendWithGlobalTrends,
  GLOBAL_TRENDS
};

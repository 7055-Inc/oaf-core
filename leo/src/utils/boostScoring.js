/**
 * Boost Scoring - The Personalization Math Engine
 * 
 * Applies user preferences to search results to create personalized rankings
 * This is the "magic" that makes Leo feel psychic!
 * 
 * NO LLM NEEDED - Just fast mathematical scoring based on user truths
 */

const logger = require('./logger');

// Boost weights (tunable for optimization)
const BOOST_WEIGHTS = {
  color: 0.30,        // Color match is very important (visual impact)
  style: 0.25,        // Style preference
  price: 0.20,        // Price fit
  medium: 0.15,       // Medium preference (painting vs sculpture)
  category: 0.15,     // Category preference
  artist: 0.15,       // Known favorite artist
  popularity: 0.10,   // Global popularity signal
  recency: 0.05,      // New arrivals
  availability: -0.50 // Penalty for out of stock
};

/**
 * Calculate personalized boost score for a search result
 * Combines vector similarity with user preferences
 * 
 * @param {Object} result - Search result from vector database
 * @param {Object} userPrefs - User preferences (from classification 141 or global trends)
 * @returns {number} Final score (0-2+)
 */
function calculateBoostScore(result, userPrefs) {
  const meta = result.metadata;
  let score = result.similarity || 0.5;  // Start with vector similarity
  let boostDetails = {};
  
  // Color boost
  const colorBoost = getColorBoost(meta, userPrefs);
  if (colorBoost !== 0) {
    score += colorBoost * BOOST_WEIGHTS.color;
    boostDetails.color = colorBoost;
  }
  
  // Style boost
  const styleBoost = getStyleBoost(meta, userPrefs);
  if (styleBoost !== 0) {
    score += styleBoost * BOOST_WEIGHTS.style;
    boostDetails.style = styleBoost;
  }
  
  // Price boost
  const priceBoost = getPriceBoost(meta, userPrefs);
  if (priceBoost !== 0) {
    score += priceBoost * BOOST_WEIGHTS.price;
    boostDetails.price = priceBoost;
  }
  
  // Medium boost
  const mediumBoost = getMediumBoost(meta, userPrefs);
  if (mediumBoost !== 0) {
    score += mediumBoost * BOOST_WEIGHTS.medium;
    boostDetails.medium = mediumBoost;
  }
  
  // Category boost
  const categoryBoost = getCategoryBoost(meta, userPrefs);
  if (categoryBoost !== 0) {
    score += categoryBoost * BOOST_WEIGHTS.category;
    boostDetails.category = categoryBoost;
  }
  
  // Artist boost
  const artistBoost = getArtistBoost(meta, userPrefs);
  if (artistBoost !== 0) {
    score += artistBoost * BOOST_WEIGHTS.artist;
    boostDetails.artist = artistBoost;
  }
  
  // Popularity boost (global signal)
  const popularityBoost = getPopularityBoost(meta, userPrefs);
  if (popularityBoost !== 0) {
    score += popularityBoost * BOOST_WEIGHTS.popularity;
    boostDetails.popularity = popularityBoost;
  }
  
  // Recency boost (new arrivals)
  const recencyBoost = getRecencyBoost(meta);
  if (recencyBoost !== 0) {
    score += recencyBoost * BOOST_WEIGHTS.recency;
    boostDetails.recency = recencyBoost;
  }
  
  // Availability penalty
  if (meta.in_stock === false && meta.track_inventory === true) {
    score += BOOST_WEIGHTS.availability;
    boostDetails.availability = -1;
  }
  
  return {
    original_score: result.similarity,
    boost_details: boostDetails,
    final_score: Math.max(0, score),  // Never go negative
    personalized: Object.keys(boostDetails).length > 0
  };
}

/**
 * Get color preference boost
 */
function getColorBoost(metadata, userPrefs) {
  if (!metadata.visual_dominant_colors || !userPrefs.color_preferences) {
    return 0;
  }
  
  // Parse colors (stored as comma-separated string)
  const colors = typeof metadata.visual_dominant_colors === 'string'
    ? metadata.visual_dominant_colors.split(',').map(c => c.trim().toLowerCase())
    : Array.isArray(metadata.visual_dominant_colors)
    ? metadata.visual_dominant_colors
    : [];
  
  if (colors.length === 0) return 0;
  
  // Find best matching color
  let maxBoost = 0;
  colors.forEach(color => {
    const pref = userPrefs.color_preferences[color] || 0;
    if (Math.abs(pref) > Math.abs(maxBoost)) {
      maxBoost = pref;
    }
  });
  
  return maxBoost;
}

/**
 * Get style preference boost
 */
function getStyleBoost(metadata, userPrefs) {
  if (!metadata.visual_style || !userPrefs.style_preferences) {
    return 0;
  }
  
  const style = metadata.visual_style.toLowerCase();
  return userPrefs.style_preferences[style] || 0;
}

/**
 * Get price preference boost
 */
function getPriceBoost(metadata, userPrefs) {
  const price = parseFloat(metadata.price);
  if (!price || !userPrefs.price_sensitivity) {
    return 0;
  }
  
  const sweetSpot = userPrefs.price_sensitivity.sweet_spot || userPrefs.price_sweet_spot || 350;
  const maxComfortable = userPrefs.price_sensitivity.max_comfortable || userPrefs.price_max || 500;
  
  // Way over budget - big penalty
  if (price > maxComfortable * 1.5) {
    return -0.8;
  }
  
  // Over budget - penalty
  if (price > maxComfortable) {
    return -0.3;
  }
  
  // Perfect price range - boost
  const diff = Math.abs(price - sweetSpot);
  if (diff < 50) {
    return 1.0;  // Perfect match!
  } else if (diff < 100) {
    return 0.7;  // Close match
  } else if (diff < 200) {
    return 0.3;  // Acceptable
  }
  
  return 0;  // Neutral
}

/**
 * Get medium preference boost (painting, sculpture, etc.)
 */
function getMediumBoost(metadata, userPrefs) {
  if (!metadata.visual_medium || !userPrefs.medium_preferences) {
    return 0;
  }
  
  const medium = metadata.visual_medium.toLowerCase();
  return userPrefs.medium_preferences[medium] || 0;
}

/**
 * Get category preference boost
 */
function getCategoryBoost(metadata, userPrefs) {
  if (!metadata.category_name || !userPrefs.category_preferences) {
    return 0;
  }
  
  const category = metadata.category_name.toLowerCase();
  return userPrefs.category_preferences[category] || 0;
}

/**
 * Get artist preference boost
 */
function getArtistBoost(metadata, userPrefs) {
  if (!metadata.vendor_id || !userPrefs.favorite_artist_ids) {
    return 0;
  }
  
  const vendorId = parseInt(metadata.vendor_id);
  if (userPrefs.favorite_artist_ids.includes(vendorId)) {
    return 1.0;  // Favorite artist!
  }
  
  return 0;
}

/**
 * Get popularity boost (global signal)
 */
function getPopularityBoost(metadata, userPrefs) {
  let boost = 0;
  
  if (metadata.is_popular) {
    boost += userPrefs.popularity_signals?.boost_popular_products || 0.15;
  }
  
  if (metadata.is_highly_favorited) {
    boost += userPrefs.popularity_signals?.boost_highly_favorited || 0.10;
  }
  
  return boost;
}

/**
 * Get recency boost (new arrivals)
 */
function getRecencyBoost(metadata) {
  if (metadata.is_new_arrival) {
    return 1.0;
  }
  
  // Calculate days since created
  if (metadata.days_since_created !== undefined) {
    if (metadata.days_since_created < 7) {
      return 0.8;  // Less than a week old
    } else if (metadata.days_since_created < 30) {
      return 0.5;  // Less than a month old
    }
  }
  
  return 0;
}

/**
 * Batch score multiple results
 * More efficient than scoring one at a time
 * 
 * @param {Array} results - Array of search results
 * @param {Object} userPrefs - User preferences
 * @returns {Array} Results with scores added
 */
function scoreResults(results, userPrefs) {
  return results.map(result => {
    const scoring = calculateBoostScore(result, userPrefs);
    return {
      ...result,
      scoring
    };
  });
}

/**
 * Sort results by final score
 * 
 * @param {Array} scoredResults - Results with scoring
 * @returns {Array} Sorted results
 */
function sortByScore(scoredResults) {
  return scoredResults.sort((a, b) => {
    const scoreA = a.scoring?.final_score || a.similarity || 0;
    const scoreB = b.scoring?.final_score || b.similarity || 0;
    return scoreB - scoreA;
  });
}

/**
 * Score and sort in one step (convenience function)
 * 
 * @param {Array} results - Search results
 * @param {Object} userPrefs - User preferences
 * @returns {Array} Scored and sorted results
 */
function scoreAndSort(results, userPrefs) {
  const scored = scoreResults(results, userPrefs);
  return sortByScore(scored);
}

/**
 * Get scoring explanation for debugging/transparency
 * 
 * @param {Object} result - Scored result
 * @returns {string} Human-readable explanation
 */
function explainScore(result) {
  if (!result.scoring) return 'No scoring applied';
  
  const { original_score, boost_details, final_score } = result.scoring;
  const boosts = Object.entries(boost_details)
    .map(([factor, value]) => `${factor}: ${value > 0 ? '+' : ''}${value.toFixed(2)}`)
    .join(', ');
  
  return `Original: ${original_score.toFixed(3)} → Final: ${final_score.toFixed(3)} (${boosts})`;
}

module.exports = {
  calculateBoostScore,
  scoreResults,
  sortByScore,
  scoreAndSort,
  explainScore,
  BOOST_WEIGHTS  // Export for tuning
};


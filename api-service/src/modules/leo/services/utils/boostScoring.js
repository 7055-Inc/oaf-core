/**
 * Boost Scoring - The Personalization Math Engine
 * 
 * Applies user preferences to search results to create personalized rankings
 * NO LLM NEEDED - Just fast mathematical scoring based on user truths
 */

const logger = require('../logger');

const BOOST_WEIGHTS = {
  color: 0.30,
  style: 0.25,
  price: 0.20,
  medium: 0.15,
  category: 0.15,
  artist: 0.15,
  popularity: 0.10,
  recency: 0.05,
  availability: -0.50
};

function calculateBoostScore(result, userPrefs) {
  const meta = result.metadata;
  let score = result.similarity || 0.5;
  let boostDetails = {};
  
  const colorBoost = getColorBoost(meta, userPrefs);
  if (colorBoost !== 0) {
    score += colorBoost * BOOST_WEIGHTS.color;
    boostDetails.color = colorBoost;
  }
  
  const styleBoost = getStyleBoost(meta, userPrefs);
  if (styleBoost !== 0) {
    score += styleBoost * BOOST_WEIGHTS.style;
    boostDetails.style = styleBoost;
  }
  
  const priceBoost = getPriceBoost(meta, userPrefs);
  if (priceBoost !== 0) {
    score += priceBoost * BOOST_WEIGHTS.price;
    boostDetails.price = priceBoost;
  }
  
  const mediumBoost = getMediumBoost(meta, userPrefs);
  if (mediumBoost !== 0) {
    score += mediumBoost * BOOST_WEIGHTS.medium;
    boostDetails.medium = mediumBoost;
  }
  
  const categoryBoost = getCategoryBoost(meta, userPrefs);
  if (categoryBoost !== 0) {
    score += categoryBoost * BOOST_WEIGHTS.category;
    boostDetails.category = categoryBoost;
  }
  
  const artistBoost = getArtistBoost(meta, userPrefs);
  if (artistBoost !== 0) {
    score += artistBoost * BOOST_WEIGHTS.artist;
    boostDetails.artist = artistBoost;
  }
  
  const popularityBoost = getPopularityBoost(meta, userPrefs);
  if (popularityBoost !== 0) {
    score += popularityBoost * BOOST_WEIGHTS.popularity;
    boostDetails.popularity = popularityBoost;
  }
  
  const recencyBoost = getRecencyBoost(meta);
  if (recencyBoost !== 0) {
    score += recencyBoost * BOOST_WEIGHTS.recency;
    boostDetails.recency = recencyBoost;
  }
  
  if (meta.in_stock === false && meta.track_inventory === true) {
    score += BOOST_WEIGHTS.availability;
    boostDetails.availability = -1;
  }
  
  return {
    original_score: result.similarity,
    boost_details: boostDetails,
    final_score: Math.max(0, score),
    personalized: Object.keys(boostDetails).length > 0
  };
}

function getColorBoost(metadata, userPrefs) {
  if (!metadata.visual_dominant_colors || !userPrefs.color_preferences) return 0;
  
  const colors = typeof metadata.visual_dominant_colors === 'string'
    ? metadata.visual_dominant_colors.split(',').map(c => c.trim().toLowerCase())
    : Array.isArray(metadata.visual_dominant_colors) ? metadata.visual_dominant_colors : [];
  
  if (colors.length === 0) return 0;
  
  let maxBoost = 0;
  colors.forEach(color => {
    const pref = userPrefs.color_preferences[color] || 0;
    if (Math.abs(pref) > Math.abs(maxBoost)) maxBoost = pref;
  });
  
  return maxBoost;
}

function getStyleBoost(metadata, userPrefs) {
  if (!metadata.visual_style || !userPrefs.style_preferences) return 0;
  const style = metadata.visual_style.toLowerCase();
  return userPrefs.style_preferences[style] || 0;
}

function getPriceBoost(metadata, userPrefs) {
  const price = parseFloat(metadata.price);
  if (!price || !userPrefs.price_sensitivity) return 0;
  
  const sweetSpot = userPrefs.price_sensitivity.sweet_spot || userPrefs.price_sweet_spot || 350;
  const maxComfortable = userPrefs.price_sensitivity.max_comfortable || userPrefs.price_max || 500;
  
  if (price > maxComfortable * 1.5) return -0.8;
  if (price > maxComfortable) return -0.3;
  
  const diff = Math.abs(price - sweetSpot);
  if (diff < 50) return 1.0;
  if (diff < 100) return 0.7;
  if (diff < 200) return 0.3;
  
  return 0;
}

function getMediumBoost(metadata, userPrefs) {
  if (!metadata.visual_medium || !userPrefs.medium_preferences) return 0;
  const medium = metadata.visual_medium.toLowerCase();
  return userPrefs.medium_preferences[medium] || 0;
}

function getCategoryBoost(metadata, userPrefs) {
  if (!metadata.category_name || !userPrefs.category_preferences) return 0;
  const category = metadata.category_name.toLowerCase();
  return userPrefs.category_preferences[category] || 0;
}

function getArtistBoost(metadata, userPrefs) {
  if (!metadata.vendor_id || !userPrefs.favorite_artist_ids) return 0;
  const vendorId = parseInt(metadata.vendor_id);
  return userPrefs.favorite_artist_ids.includes(vendorId) ? 1.0 : 0;
}

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

function getRecencyBoost(metadata) {
  if (metadata.is_new_arrival) return 1.0;
  if (metadata.days_since_created !== undefined) {
    if (metadata.days_since_created < 7) return 0.8;
    if (metadata.days_since_created < 30) return 0.5;
  }
  return 0;
}

function scoreResults(results, userPrefs) {
  return results.map(result => ({
    ...result,
    scoring: calculateBoostScore(result, userPrefs)
  }));
}

function sortByScore(scoredResults) {
  return scoredResults.sort((a, b) => {
    const scoreA = a.scoring?.final_score || a.similarity || 0;
    const scoreB = b.scoring?.final_score || b.similarity || 0;
    return scoreB - scoreA;
  });
}

function scoreAndSort(results, userPrefs) {
  const scored = scoreResults(results, userPrefs);
  return sortByScore(scored);
}

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
  BOOST_WEIGHTS
};

# Leo AI Components - Quick Reference

## 🎯 When to Use Which Component

### Need to Filter Content?
```javascript
const { getStandardFilters } = require('./src/utils/searchFilters');
const filters = getStandardFilters('products');  // Only active, in-stock products
```

### Need User Preferences?
```javascript
const { getUserPreferences } = require('./src/utils/userPreferences');
const prefs = await getUserPreferences(userId, vectorDB);  // 1ms, cached
```

### Need Platform Baseline?
```javascript
const { getGlobalTrends } = require('./src/utils/globalTrends');
const trends = getGlobalTrends();  // For anonymous users
```

### Need to Personalize Results?
```javascript
const { scoreAndSort } = require('./src/utils/boostScoring');
const scored = scoreAndSort(results, userPrefs);  // Apply boosts, sort
```

### Need Complete Search?
```javascript
const SearchServiceV2 = require('./src/services/searchService-v2');
const results = await searchService.search(query, { userId, categories, limit });
```

---

## 🔄 Common Patterns

### Pattern 1: Custom Recommendation Feature
```javascript
const { getUserPreferences } = require('./src/utils/userPreferences');
const { scoreAndSort } = require('./src/utils/boostScoring');
const { getStandardFilters } = require('./src/utils/searchFilters');

async function myCustomFeature(userId) {
  // 1. Filter (safety)
  const filters = getStandardFilters('products');
  
  // 2. Search (relevance)
  const results = await vectorDB.search('art', 'art_metadata', { 
    limit: 50, 
    filter: filters 
  });
  
  // 3. Load prefs (personalization)
  const prefs = await getUserPreferences(userId, vectorDB);
  
  // 4. Score & sort (magic!)
  return scoreAndSort(results, prefs).slice(0, 10);
}
```

### Pattern 2: Anonymous User Fallback
```javascript
const { getUserPreferences } = require('./src/utils/userPreferences');
const { getGlobalTrends } = require('./src/utils/globalTrends');

const prefs = userId && userId !== 'anonymous'
  ? await getUserPreferences(userId, vectorDB)
  : getGlobalTrends();
```

### Pattern 3: Session-Based Real-Time Learning
```javascript
const { updateSessionCache } = require('./src/utils/userPreferences');

// User swipes right
updateSessionCache(userId, {
  type: 'swipe_right',
  product_colors: ['blue'],
  product_style: 'abstract'
});

// Next search is instantly more personalized!
```

---

## 🎨 Use Cases

| Feature | Components Needed |
|---------|------------------|
| **Search** | searchFilters + userPreferences + boostScoring |
| **Homepage "For You"** | userPreferences + boostScoring |
| **Discover Feed** | getGlobalTrends + scoreAndSort |
| **Email Campaigns** | getUserPreferences + scoreAndSort |
| **Product Recommendations** | getUserPreferences + boostScoring |
| **Art-Tinder Queue** | updateSessionCache + scoreAndSort |
| **Artist Directory** | searchFilters(artists) + basic search |
| **Admin Dashboard** | getAdminFilters + getGlobalTrends |

---

## ⚡ Performance Tips

1. **Cache user prefs** - Already done! (5-min TTL)
2. **Batch scoring** - Use `scoreResults()` for multiple items
3. **Limit results** - Score top 100, return top 20
4. **Session cache** - Use for real-time feel without DB updates
5. **Global trends** - Instant fallback for anonymous users

---

## 🔧 Tuning

### Adjust Boost Weights (boostScoring.js)
```javascript
const BOOST_WEIGHTS = {
  color: 0.30,     // Increase if visual is more important
  style: 0.25,     // Increase for style-conscious users
  price: 0.20,     // Increase for price-sensitive users
  // ... etc
};
```

### Adjust Cache TTL (userPreferences.js)
```javascript
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes (increase for more caching)
```

### Update Global Trends (globalTrends.js)
```javascript
// Weekly batch job
await updateGlobalTrends(analyzedData);
```

---

## 📚 Full Docs

See `SMART_SEARCH_README.md` for complete documentation!


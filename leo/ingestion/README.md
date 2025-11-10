# Leo AI - Manual Ingestion Scripts

This directory contains curated ingestion scripts for high-value tables that require Layer 2 computed metadata and cross-table correlations.

## Philosophy

**Manual Scripts (this directory):** High-value tables with intelligence
- Full Layer 1 + Layer 2 metadata
- Cross-table correlations
- Classification tags
- Quality signals
- Optimized queries

**Vacuum Script (../vacuum-ingestion.js):** Safety net for everything else
- Simple bulk ingestion (Layer 1 only)
- Catches tables not in manual scripts
- Ensures nothing is missed

## Current Scripts

### ✅ `ingest-users.js` (READY)

**What it ingests:**
- `users` table (core user data)
- `user_profiles` (main profile: name, location, bio, social)
- `artist_profiles` (art categories, mediums, studio info)
- `promoter_profiles` (business info, organization details)
- `community_profiles` (art preferences, favorite colors, interests)

**Layer 1 Metadata:**
- All raw SQL fields from 5 tables
- User type, status, verification
- Profile data, location, social links

**Layer 2 Metadata (Current):**
- Classification: `141` (User preferences)
- Days since signup/last login
- Profile completeness signals
- Active user status
- Preference data presence flags

**Layer 2 Metadata (Future - To Add):**
- `total_orders` - Count from orders table
- `total_spent` - Sum from orders table
- `review_rate` - Reviews / Orders
- `favorite_count` - Count from saved_items
- `color_preferences` - Calculated from order history
- `category_preferences` - Calculated from browsing/purchases
- `purchase_frequency` - Days between orders average
- `customer_tier` - Calculated from spend/frequency

**Usage:**
```bash
# Ingest all users (from beginning)
node ingestion/ingest-users.js

# Ingest users updated since specific date
node ingestion/ingest-users.js "2025-11-01 00:00:00"
```

**Output:**
- Ingests to `user_profiles` collection in ChromaDB
- Logs to `logs/user-ingestion.log`
- Returns stats: total users, breakdown by type, profile completeness

---

### 🚧 `ingest-products.js` (TODO)

Will ingest:
- Products + inventory + categories + images
- Sales counts, review counts, ratings
- Classification (101: active, 102: deleted)

### 🚧 `ingest-orders.js` (TODO)

Will ingest:
- Orders with user + product correlation
- Purchase patterns (day of week, time, frequency)
- Classification: 131 (Purchase history)

### 🚧 `run-all.js` (TODO)

Orchestrator that runs all manual scripts in correct order, then runs vacuum for safety net.

---

## Development Workflow

### Adding New Manual Scripts

1. **Identify high-value table** that needs Layer 2 intelligence
2. **Create script** in this directory: `ingest-{entity}.js`
3. **Add cross-table JOINs** to enrich data
4. **Calculate Layer 2 metadata** (aggregations, ratios, patterns)
5. **Add classification tags** (101, 102, 141, etc.)
6. **Update vacuum exclusion list** to skip this table
7. **Update this README** with script details

### Promoting Tables from Vacuum → Manual

As tables prove valuable:
1. Move from vacuum (Layer 1 only) to manual script (Layer 1 + Layer 2)
2. Add computed metadata and correlations
3. Improve intelligence quality over time

---

## Classification Tags

From `DATA_CLASSIFICATION.md`:

- **101**: Active Products (customer shopping)
- **102**: Deleted Products (trend analysis)
- **131**: User Purchase History
- **141**: User Preferences (synthesized)
- **151**: Search Queries
- **301**: Beacon Dwell Data
- **302**: Event Performance

---

## Future Enhancements

### User Ingestion (ingest-users.js)

**Behavior Calculations to Add:**
```sql
-- Add to getUsersWithProfiles query:
COUNT(DISTINCT o.id) as total_orders,
SUM(o.total_amount) as total_spent,
AVG(o.total_amount) as avg_order_value,
COUNT(DISTINCT si.id) as favorite_count,
MAX(o.created_at) as last_purchase_date
```

**Color Preference Calculation:**
```javascript
// After main query, for each user:
const [colorPrefs] = await db.execute(`
  SELECT 
    -- Get color from product metadata or images
    -- Calculate % of purchases per color
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.user_id = ?
`);
```

**Truth Patterns to Discover:**
- "User prefers [color]" (from purchase history + community preferences)
- "User is weekend shopper" (from order timestamps)
- "User is price sensitive" (from price variance in purchases)
- "User likes [category]" (from browsing + purchases)


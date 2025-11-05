# Leo AI Platform - Architecture Documentation

> **Named after Leonardo da Vinci - Master of Art and Innovation**
> 
> *This document serves as the complete architectural blueprint for Leo AI. It captures our vision, architectural decisions, implementation roadmap, and technical specifications. Reference this document throughout development to maintain consistency and understanding of the system's design.*

---

## Table of Contents
1. [Vision & Philosophy](#vision--philosophy)
2. [Core Architectural Principles](#core-architectural-principles)
   - **Data Classification System** ← Start here to understand data organization
3. [System Architecture](#system-architecture)
4. [Data Ecosystem](#data-ecosystem)
5. [Current State & Components](#current-state--components)
6. [Feature Roadmap](#feature-roadmap)
7. [Technical Specifications](#technical-specifications)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Decision Log](#decision-log)
10. [Success Metrics](#success-metrics)

---

## Document Structure

**This document (ARCHITECTURE.md):**
- Overall system design and philosophy
- Three-tier processing model
- Feature roadmap and implementation phases
- Technical specifications and performance targets

**Companion document (DATA_CLASSIFICATION.md):**
- Complete catalog of ALL data types (Dewey Decimal style)
- Use cases and query routing rules for each classification
- Examples of cross-classification intelligence
- Reference for developers adding new data

**Implementation plan (INGESTION_OVERHAUL_PLAN.md):**
- Step-by-step plan for adding classification system to vacuum script
- SQL schema updates needed (timestamp columns)
- Classification rules engine design
- Testing strategy and rollout timeline
- Wipe/rebuild process for vector database

**Read all three documents together for complete understanding.**

---

## Vision & Philosophy

### The North Star
**"All Data Influences All Data"** - Leo AI is not a collection of separate features. It is a unified intelligence layer where every data point can inform every decision across the entire platform.

### What This Means in Practice

**Example 1: The Glass Booth Story**
```
User lingers 14 minutes at a glass booth (beacon data)
  + User hesitates before swiping on 2 glass sculptures (behavioral data)
  + Glass booth belongs to Artist X (artist/product data)
  + User has previously browsed abstract paintings (browsing history)
  ↓
Intelligence inference: Strong glass art preference
  ↓
Action: Send email about glasswork ceramics exhibit next week
```

This single recommendation required **4 different data sources** talking to each other: beacon tracking, product catalog, behavioral patterns, and user profile.

**Example 2: The Rain & Journals Story**
```
Artist sells paper journals (product data)
  + Event has rain 4/5 years historically (weather data)
  + Similar paper products perform poorly in rain (sales correlation)
  + Artist would otherwise do well at event (compatibility score)
  ↓
Intelligence inference: High risk of product damage
  ↓
Action: Don't recommend this event to this artist
```

This prevention required **5+ data variables** creating one intelligent decision: product type, weather history, sales performance, event characteristics, artist profile.

### The TikTok Standard
Our goal is **"creepy accurate"** recommendations - the kind where users think "how did it know I wanted that?" This requires:
- **Multi-layered personalization**: User + content + context (time, location, behavior)
- **Continuous learning**: System gets smarter with every interaction
- **Feedback loops**: Recommendations influence behavior, which influences future recommendations
- **Exploration vs exploitation**: Show new things while delivering what works

### Core Philosophical Principles

1. **Let AI Decide How to Handle AI Tasks**
   - Instead of hardcoded endpoints and logic, Llama analyzes requests dynamically
   - System adapts without constant code changes
   - Intelligence layer sits above application logic

2. **Unified Intelligence, Multiple Interfaces**
   - Artist asks "Where will I succeed?" → Same engine as promoter asking "Who should I invite?"
   - Different query interfaces, same underlying fit calculation
   - Bi-directional and tri-directional recommendations from one model

3. **Behavioral Equivalence**
   - Physical: Lingering at booth = Strong interest
   - Digital: Repeatedly visiting profile = Strong interest
   - Same meaning, different medium, equal weight in intelligence

4. **Scale Philosophy**
   - Start simple (single server, localhost)
   - Design distributed (stateless services, queue-based)
   - Hire senior engineer when revenue allows
   - Premature optimization kills projects

5. **Daily Intelligence, Session Awareness**
   - Nightly jobs rebuild complete profiles
   - Session-specific boosts for immediate context
   - Gift shopping today doesn't pollute personal preferences tomorrow

---

## Core Architectural Principles

### Data Classification System (The Foundation)

**Before anything else, understand how Leo organizes data.**

Leo uses a **Dewey Decimal-style classification system** to organize ALL platform data by purpose and use case. This is documented in detail in [`DATA_CLASSIFICATION.md`](./DATA_CLASSIFICATION.md).

**Why This Matters:**
- Different questions need different data types
- Shopping queries don't need weather data
- Event analysis doesn't need product color options
- Classification tags determine which "drawer" data lives in

**How It Works:**
```
100 Series: Product Data
  ├── 101: Active Products (customer shopping)
  ├── 102: Deleted Products (trend analysis)
  └── 103: Draft Products (inventory prediction)

130 Series: User Behavioral Data
  ├── 131: Purchase History
  ├── 141: User Preferences (synthesized)
  └── 151: Search Queries

300 Series: Event & Physical Data
  ├── 301: Beacon Dwell Data
  └── 302: Event Performance

400 Series: Content Data
  ├── 401: Draft Articles (content strategy)
  └── 402: Published Articles (customer help)

500 Series: Support & Help Data
  ├── 501: Support Cases & Tickets

200 Series: External Environmental Data (context-specific)
  ├── 201: Weather Historical Data
  └── 202: Economic Indicators
```

**Key Principle: Data Moves, Not Deleted**
When a product goes from active → deleted, its classification changes from `101` → `102`. The data stays intact but moves to a different intelligence system:
- `101`: Used for shopping recommendations
- `102`: Used for trend death detection

**One tag change = entire system-wide intelligence shift**

**Extending Classifications:**
Need more detail? Add decimals:
- `101.1`: Featured Products
- `101.2`: New Arrivals
- `101.3`: Best Sellers

Adding new data types is plug-and-play: extend the decimal catalog, tag the data, and Leo automatically routes queries correctly.

**Context-Specific Data:**
Some data (200 Series: weather, economics) is only examined when contextually relevant:
- Shopping query → Only queries 101 + 141 (fast, clean)
- Event analysis → Queries 302 + 201 + 202 (deep, comprehensive)

**Reference:** See [`DATA_CLASSIFICATION.md`](./DATA_CLASSIFICATION.md) for complete catalog of classifications, use cases, and query routing rules.

---

### Three-Tier Processing Model

Leo operates on three distinct processing tiers, each optimized for different use cases:

```
┌───────────────────────────────────────────────────────────────┐
│                    TIER 1: FAST LAYER                         │
│                    Real-time Serving (<50ms)                  │
├───────────────────────────────────────────────────────────────┤
│  Purpose: Above-the-fold content, instant responses           │
│  Method: Pre-computed results served from Redis cache         │
│  Use Cases:                                                   │
│    - Visual Discovery Band (homepage)                         │
│    - Quick product recommendations                            │
│    - Trending/featured content                                │
│  Technology: Redis cache + waterfall fallbacks                │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    TIER 2: SMART LAYER                        │
│                    Real-time Intelligence (<2s)               │
├───────────────────────────────────────────────────────────────┤
│  Purpose: Interactive features requiring personalization      │
│  Method: Real-time model inference + cached profiles          │
│  Use Cases:                                                   │
│    - Smart search results                                     │
│    - Chatbot conversations                                    │
│    - Dynamic filtering                                        │
│  Technology: Central Brain + Vector DB + User Profiles        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    TIER 3: DEEP LAYER                         │
│                    Batch Processing (hours)                   │
├───────────────────────────────────────────────────────────────┤
│  Purpose: Complex analysis, pattern discovery, learning       │
│  Method: Nightly jobs with multi-model ensembles              │
│  Use Cases:                                                   │
│    - User profile building                                    │
│    - Truth extraction & validation                            │
│    - Artist-event compatibility scoring                       │
│    - Traffic pattern analysis                                 │
│    - Business intelligence reports                            │
│  Technology: Multiple specialized models + Llama + SQL analytics│
└───────────────────────────────────────────────────────────────┘
```

### Hybrid Data Architecture (SQL + Vectors)

**Decision:** Use SQL for structured queries + Vectors for semantic intelligence

**Why:** Different data types require different approaches:
- **SQL excels at:** Exact matches, filtering, aggregations, joins
- **Vectors excel at:** Semantic similarity, fuzzy matching, pattern discovery

**Example Query:**
```sql
-- SQL: Fast filtering
SELECT * FROM products 
WHERE status='active' AND price < 500 AND color IN ('blue', 'green')

-- Vector: Semantic similarity
chromaDB.query("abstract blue sculptures", collection="art_metadata")

-- Combined: Best of both worlds
1. Vector search finds semantically similar items
2. SQL filters by status, price, availability
3. User profile boosts apply
4. Return top 20 results
```

### Truth Storage Strategy (Raw + Interpreted)

**Store both raw observations and interpreted patterns:**

**Raw Truth:**
```javascript
{
  type: "raw_observation",
  content: "User 123 spent 14 minutes at glass booth, 12 minutes at ceramics booth",
  data: {
    userId: 123,
    beaconEvents: [
      { artistId: 45, dwellTime: 840, booth: "A12" },
      { artistId: 67, dwellTime: 720, booth: "B05" }
    ],
    timestamp: "2025-01-23T14:35:00Z"
  },
  confidence: 1.0  // Raw data is factual
}
```

**Interpreted Truth:**
```javascript
{
  type: "user_preference",
  content: "User 123 has strong preference for glass and ceramic art",
  metadata: {
    userId: 123,
    sourceEvents: ["raw_obs_456", "raw_obs_789"],
    categories: ["glass_art", "ceramics"],
    confidence_reasoning: "Multiple extended dwell times + hesitation on swipes indicates strong interest",
    strength: 0.92
  },
  confidence: 0.92,  // Interpretation has uncertainty
  extracted_at: "2025-01-23T02:00:00Z"
}
```

**Why Both:**
- Raw data preserves precision (14 vs 2 minutes = very different)
- Interpreted truths are faster to query ("show me glass art lovers")
- Interpreted truths can be wrong - we can revalidate against raw data

### Session Blending (Nightly + Real-time)

**Problem:** Real-time updates without polluting long-term profiles

**Solution:** Blend nightly profiles with session-specific boosts

```javascript
// Nightly Profile (authoritative, stable)
{
  userId: 123,
  color_preferences: { blue: 0.85, red: 0.20, green: 0.45 },
  style_preferences: { abstract: 0.75, landscape: 0.60 },
  last_rebuilt: "2025-01-23T02:00:00Z"
}

// Session Boosts (temporary, experimental)
{
  userId: 123,
  sessionId: "abc-def",
  temporary_interests: { sculptures: +0.3, gifts: +0.5 },
  expires_at: "2025-01-23T18:00:00Z"
}

// Blended at Query Time
{
  userId: 123,
  color_preferences: { blue: 0.85, red: 0.20, green: 0.45 },  // unchanged
  style_preferences: { 
    abstract: 0.75, 
    landscape: 0.60,
    sculptures: 0.30  // session boost applied
  },
  context: "gift_shopping"  // influences display, not profile
}
```

**Why This Works:**
- User browsing gifts today → see gift recommendations now
- User returns tomorrow for personal shopping → gifts not in profile
- Session expires → back to true preferences

---

## System Architecture

### High-Level Flow
```
User Query → Component → Central Brain → Classification Routing → Query Appropriate Collections → Apply Intelligence → Component → SQL APIs → User Display
```

**Classification Routing:** API reads query intent and determines which data classifications to query (e.g., shopping = 101+141, event analysis = 302+201+202)

### Detailed Flow
1. **User Interaction**: User performs action (search, browse homepage, etc.)
2. **Component Processing**: Frontend component sends request to API
3. **Classification Routing**: API determines which data classifications to query based on request type
4. **Data Gathering**: Query appropriate classified collections (101 for shopping, 302+201 for events, etc.)
5. **Intelligence Application**: Apply user profiles (141), scoring, and ranking
6. **Component Response**: Return organized results with IDs
7. **Frontend Display**: Use IDs to show full product/content data

---

## Data Ecosystem

### The Knowledge Graph Concept

Leo doesn't treat data as isolated tables. Instead, it builds a **knowledge graph** where:
- Every data point is a node
- Every correlation is an edge  
- Intelligence emerges from traversing these connections

**Example: The Glass Booth Intelligence Chain**
```
User Node (123)
  ├─ spent 14min → Glass Booth Node (Beacon Data)
  │   └─ belongs_to → Artist X Node
  │       └─ makes → Glass Sculptures (Product Data)
  ├─ hesitated_on → Glass Sculpture Swipes (Behavioral Data)
  └─ previously_browsed → Abstract Paintings (History)
      └─ shares_category → Visual Art (Taxonomy)

Intelligence Path Found:
User → Beacon → Artist → Product + User → Behavior → Product
= Strong glass art preference detected
```

### Current Data Sources (Now)

| Data Source | Type | Storage | Update Frequency | Example Use |
|-------------|------|---------|------------------|-------------|
| **Products** | SQL | MySQL | Real-time | Product recommendations, search results |
| **Users** | SQL | MySQL | Real-time | Personalization, profiles |
| **Orders** | SQL | MySQL | Real-time | Purchase patterns, success metrics |
| **Events** | SQL | MySQL | Real-time | Event-artist matching, recommendations |
| **Behavioral** | Vector | ChromaDB | Continuous | User preferences, interaction patterns |
| **Reviews** | SQL + Vector | Both | Real-time | Sentiment analysis, quality signals |
| **Site Content** | Vector | ChromaDB | Daily | Chatbot knowledge, article recommendations |

### Near-Future Data Sources (Weeks-Months)

| Data Source | Type | Purpose | Intelligence Unlock |
|-------------|------|---------|---------------------|
| **Bluetooth Beacons** | SQL + Vector | Track physical foot traffic at events | - Dwell time = interest level<br>- Path flow = discovery patterns<br>- Artist similarity (people who visit A also visit B)<br>- Layout optimization for promoters |
| **Weather Data** | SQL | Overlay on event history | - Predict product viability (rain + paper = bad)<br>- Event success factors<br>- Seasonal patterns |
| **Support Cases** | SQL + Vector | Customer service knowledge | - Chatbot learning from human solutions<br>- Pattern detection in problems<br>- Auto-resolution paths |

### Future Data Sources (Long-term)

| Data Source | Type | Purpose | Intelligence Unlock |
|-------------|------|---------|---------------------|
| **Economic Indicators** | SQL | Market conditions | - Price optimization<br>- Event timing recommendations<br>- Purchase prediction |
| **Device/Browser Data** | SQL | User environment | - UX optimization<br>- Feature adoption patterns<br>- Technical preferences |
| **User Explicit Preferences** | SQL + Vector | Direct user input | - "I prefer landscapes" explicit signal<br>- Override implicit patterns when needed<br>- Trust calibration |

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SQL Tables (Real-time)                                         │
│  ├─ Products, Users, Orders, Events                             │
│  ├─ Beacon events, Weather, Support cases                       │
│  └─ Indexed for fast queries                                    │
│                                                                 │
│                    ↓ (Vacuum Ingestion - Nightly)               │
│                                                                 │
│  Vector Database (ChromaDB Port 8000)                           │
│  ├─ art_metadata (products as semantic vectors)                 │
│  ├─ site_content (articles, help docs)                          │
│  ├─ user_interactions (behavioral patterns)                     │
│  ├─ event_data (events as semantic vectors)                     │
│  └─ support_knowledge (case resolutions)                        │
│                                                                 │
│                    ↓ (Truth Extraction - Continuous)            │
│                                                                 │
│  Truth Database (ChromaDB Port 8001)                            │
│  ├─ user_truths (User 123 prefers glass art)                   │
│  ├─ behavioral_truths (Dwell time > 10min = strong interest)   │
│  ├─ content_truths (Blue products correlate with ceramics)     │
│  ├─ pattern_truths (Rain events = 30% lower paper sales)       │
│  └─ temporal_truths (Spring = landscape preference spike)      │
│                                                                 │
│                    ↓ (Profile Building - Nightly)               │
│                                                                 │
│  Redis Cache (Fast Access)                                      │
│  ├─ user:{id}:profile (Complete user preferences)               │
│  ├─ user:{id}:homepage_recs (Pre-computed recommendations)      │
│  ├─ homepage:trending (Hot products right now)                  │
│  └─ artist:{id}:event_matches (Pre-scored event fits)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### How Data Types Interconnect

**Scenario: Artist Event Recommendation**

```javascript
// Step 1: Get artist profile from SQL
const artist = await db.query(`
  SELECT * FROM users WHERE id = ? AND user_type = 'artist'
`, [artistId]);

// Step 2: Get artist's product characteristics
const products = await db.query(`
  SELECT category, style, price_range, materials 
  FROM products WHERE vendor_id = ?
`, [artistId]);

// Step 3: Vector search for similar successful artists
const similarArtists = await vectorDB.semanticSearch(
  `${products.category} ${products.style} artist profile`,
  'user_interactions',
  { limit: 20 }
);

// Step 4: Get events those similar artists succeeded at
const successfulEvents = await db.query(`
  SELECT event_id, AVG(sales) as avg_sales
  FROM event_sales
  WHERE artist_id IN (?)
  GROUP BY event_id
  HAVING avg_sales > 5000
`, [similarArtists.map(a => a.id)]);

// Step 5: Check weather history for events (if rain-sensitive products)
if (products.materials.includes('paper')) {
  const weatherData = await db.query(`
    SELECT event_id, AVG(rain_chance) as rain_risk
    FROM event_weather_history
    WHERE event_id IN (?)
    GROUP BY event_id
  `, [successfulEvents.map(e => e.event_id)]);
  
  // Filter out high-rain events
  successfulEvents = successfulEvents.filter(e => 
    weatherData.find(w => w.event_id === e.event_id).rain_risk < 0.4
  );
}

// Step 6: Apply behavioral truths
const truths = await truthDB.searchTruths(
  `event success factors for ${products.category}`,
  'pattern_truths'
);

// Step 7: Score and rank
const scoredEvents = successfulEvents.map(event => ({
  ...event,
  fit_score: calculateFitScore(event, artist, products, truths)
}));

return scoredEvents.sort((a, b) => b.fit_score - a.fit_score).slice(0, 10);
```

This single recommendation used: **SQL (artists, products, sales, weather) + Vectors (similar artists, truths) + Business logic (scoring)**

---

## Current State & Components

### What's Being Kept (Active)

**1. SQL Database** ✅
- All product, user, order, event data
- Fast, reliable, source of truth
- Will be primary data source for Phase 1

**2. Vector Databases (Dormant)** 🔄
- **Files**: `leo/src/core/vectorDatabase.js` (Port 8000), `leo/src/core/truthVectorDatabase.js` (Port 8001)
- **Status**: Still running, but NOT used in Phase 1
- **Collections**: `art_metadata`, `site_content`, `user_interactions`, `event_data`, `learning_feedback`
- **Future**: Will be reactivated in Phase 2+ for semantic search

**3. Embedding Service** ✅
- **File**: `leo/src/python/embedding_service.py`
- **Status**: Good foundation for future semantic search
- **Future**: Will be used when we add vector-based features

### What's Being Bypassed (Deprecated for Phase 1)

**1. Central Brain** ❌ → 🔄
- **File**: `leo/src/core/centralBrain.js`
- **Problem**: Too slow (multiple Llama calls per request), unreliable results
- **Phase 1 Status**: Bypassed completely, /api/leo routes rewritten to use Redis+SQL
- **Future**: Will be rebuilt with faster, focused models in Phase 2+

**2. Llama 3.2 Real-time Use** ❌ → 🔄
- **Problem**: 500ms-2s per call, confused by multi-modal queries
- **Phase 1 Status**: Not used for real-time recommendations/search
- **Future**: Will be used for batch processing (overnight profile building, truth extraction) where speed doesn't matter

**3. Truth Extraction (Current)** ❌ → 🔄
- **Files**: `truthExtractor.js`, `continuousTruthDiscovery.js`
- **Problem**: Operating on dirty data, extracting patterns from garbage
- **Phase 1 Status**: Disabled/not running
- **Future**: Will rebuild once data quality verified in Phase 1

**4. Vacuum Ingestion** ❌ → 🔄
- **File**: `vacuum-ingestion.js`
- **Problem**: Ingesting everything without filtering (including deleted items, color options, etc.)
- **Phase 1 Status**: Not running
- **Future**: Will add quality filters before re-enabling

### What Was Deleted

**1. Hero Feed Route** 🗑️
- **File**: `/api-service/src/routes/hero-feed.js` (deleted)
- **Reason**: Old, unused, problematic endpoint

**2. Empty Tools Directory** 🗑️
- **Directory**: `/leo/src/tools/` (deleted)
- **Reason**: Empty, unused

---

## Request Flow Examples

### Homepage Recommendations
```javascript
// Component Request
{
  query: "homepage recommendations",
  context: {
    userId: "user123",
    requestType: "recommendation",
    page: "homepage",
    limit: 6
  }
}

// Central Brain Process
1. Llama Analysis: "This is a recommendation request for homepage display"
2. Data Gathering: Search art_metadata + user behavioral truths
3. Llama Organization: "Show products 456,789,123 based on user's modern art preference"

// Component Response
{
  organized_results: {
    products: [
      {id: "456", relevance: 0.95, reason: "matches user's modern art preference"},
      {id: "789", relevance: 0.87, reason: "similar to previous purchases"},
      {id: "123", relevance: 0.82, reason: "trending in user's style category"}
    ]
  }
}

// Frontend Action
- Calls SQL API: GET /products/456, GET /products/789, GET /products/123
- Gets real product data: names, prices, images, descriptions
- Displays beautiful product tiles with actual information
```

### User Search
```javascript
// Component Request
{
  query: "red abstract paintings under $500",
  context: {
    userId: "user123",
    requestType: "search",
    page: "search",
    limit: 20
  }
}

// Central Brain Process
1. Llama Analysis: "Search for products with color/style/price filters + personalization"
2. Data Gathering: Search art_metadata + apply user truths for red preference
3. Llama Organization: "Prioritize these products based on user's abstract art history"

// Component Response
{
  organized_results: {
    products: [{id: "234", relevance: 0.92, reason: "red abstract under budget"}],
    articles: [{id: "567", relevance: 0.78, reason: "abstract art guide"}]
  }
}
```

---

## Key Architectural Principles

### 1. Single Source of Intelligence
- **One Brain**: All intelligence flows through Central Brain
- **Llama Decides**: AI determines how to handle each request
- **No Hardcoded Logic**: System adapts based on AI analysis

### 2. Clean Separation of Concerns
- **Brain**: Handles intelligence and returns IDs
- **Components**: Handle display and user interaction
- **SQL APIs**: Serve clean data by ID
- **Vector DBs**: Store semantic searchable content
- **Truth DBs**: Store behavioral patterns and insights

### 3. ID-Based Architecture
- **Brain Returns IDs**: Not full data objects
- **Components Fetch Data**: Using existing SQL APIs
- **Clean Integration**: New intelligence layer doesn't break existing systems

### 4. Llama-Driven Decisions
- **Query Analysis**: Llama determines intent and execution plan
- **Result Organization**: Llama applies truths and organizes responses
- **Adaptive Behavior**: System learns new patterns without code changes

---

## Development Guidelines

### Adding New Features
1. **Don't create new endpoints** - extend Central Brain capabilities
2. **Let Llama decide** - add intelligence to analysis prompts, not hardcoded logic
3. **Return IDs** - brain should return clean ID lists, not full data
4. **Use existing APIs** - leverage current SQL endpoints for data fetching

### Component Integration
```javascript
// Good: Natural language query with context
const response = await fetch('/api/leo/query', {
  method: 'POST',
  body: JSON.stringify({
    query: "show me products similar to what I bought last month",
    context: {
      userId: currentUser.id,
      requestType: "recommendation",
      page: "profile",
      limit: 10
    }
  })
});

// Use the organized IDs to fetch real data
const productIds = response.organized_results.products.map(p => p.id);
const products = await fetchProductsByIds(productIds);
```

### Truth Integration
- **Automatic**: Truth extraction runs continuously in background
- **Behavioral**: System learns user patterns automatically
- **Applied**: Central Brain applies truths during query processing
- **Transparent**: Users see intelligent results without knowing how

---

## File Organization

### Core Intelligence
- `leo/src/core/centralBrain.js` - Main intelligence coordinator
- `leo/src/core/vectorDatabase.js` - Main data storage
- `leo/src/core/truthVectorDatabase.js` - Behavioral pattern storage

### Data Processing
- `leo/vacuum-ingestion.js` - Automated data ingestion
- `leo/src/services/truthExtractor.js` - Pattern extraction
- `leo/src/services/continuousTruthDiscovery.js` - Continuous learning

### API Layer
- `leo/src/api/brainRoutes.js` - Single brain endpoint (future)
- `leo/src/api/vectorRoutes.js` - Basic vector operations (health, stats)

### Utilities
- `leo/src/utils/leoManager.js` - System management
- `leo/src/utils/logger.js` - Logging utilities

---

## Feature Roadmap

### Priority Order & Implementation Phases

**Philosophy:** Build features that prove value quickly, then expand intelligence layer by layer.

### PHASE 0: Data Foundation (Weeks 1-2) 🗂️
**Goal:** Organize data properly using classification system before building ANY intelligence

**Current State Reality Check:**
- ❌ Vector database has mixed data (active/deleted/draft all together)
- ❌ No classification tags on data
- ❌ Cannot query "just active products" vs "just deleted products"
- ❌ SQL tables missing updated_at columns for incremental updates
- ✅ SQL Database has all the data, just needs organization

**Philosophy:** You cannot build intelligence on chaos. Organize data FIRST using classification system, then build intelligence on top of organized data.

---

#### 0.1 SQL Schema Preparation (Week 1, Days 1-2)

**Add missing timestamp columns:**
```sql
-- Audit what's missing
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME NOT IN (
  SELECT DISTINCT TABLE_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE COLUMN_NAME = 'updated_at'
);

-- Add to tables that need it
ALTER TABLE {table_name} 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

**Result:** All tables trackable for incremental ingestion

**Files:**
- SQL migration script (run once)

---

#### 0.2 Classification Rules Engine (Week 1, Days 3-4)

**Create the classification logic:**

**Files:**
- `/leo/src/utils/classificationRules.js` (NEW - see INGESTION_OVERHAUL_PLAN.md for full code)

**What it does:**
- Takes any SQL record + table name
- Returns classification code (101, 102, 103, etc.)
- Returns vector collection name
- Returns purpose and confidence

**Example:**
```javascript
ClassificationRules.classify('products', { status: 'active', deleted_at: null })
// Returns: { code: '101', collection: '101_active_products', purpose: 'Shopping', confidence: 1.0 }
```

---

#### 0.3 Update Vacuum Ingestion (Week 1, Days 5-7)

**Modify vacuum-ingestion.js to use classification:**
- Import classificationRules.js
- Replace simple table-name routing with classification logic
- Add classification metadata to every document
- Route to classification-named collections (101_active_products, not art_metadata)
- Log warnings for unclassified data (999 fallback)

**Files:**
- `/leo/vacuum-ingestion.js` (MODIFY)

---

#### 0.4 Wipe & Rebuild Vector Database (Week 2, Days 1-3)

**Clean slate with organized data:**

1. **Backup if needed** (optional - it's test data)
2. **Wipe existing vectors:**
   ```bash
   # Delete all existing collections
   rm -rf leo/data/chroma_db/*
   ```
3. **Reset vacuum timestamp:**
   ```bash
   rm leo/data/last-vacuum-run.json
   ```
4. **Run vacuum with new classification:**
   ```bash
   node leo/vacuum-ingestion.js
   ```
5. **Verify collections created:**
   ```bash
   curl http://localhost:8000/api/v1/collections
   # Should see: 101_active_products, 102_deleted_products, 131_purchase_history, etc.
   ```

**Result:** Vector database organized by classification codes

---

#### 0.5 Validation (Week 2, Days 4-5)

**Verify data is properly organized:**
- Check each classification has expected record count
- Spot-check records in each collection match classification rules
- Verify < 5% of data in 999_general_knowledge
- Test basic queries against new structure

**Success Criteria:**
- ✅ All vector collections named by classification codes
- ✅ Products separated: 101 (active), 102 (deleted), 103 (draft)
- ✅ Articles separated: 401 (draft), 402 (published)
- ✅ Orders classified: 131 (completed purchases)
- ✅ Less than 5% unclassified data (999)
- ✅ All data has classification metadata

---

### PHASE 1: SQL Intelligence Engine (Weeks 3-5) 🏗️
**Goal:** Build real intelligence using properly classified data

**Now that data is organized, build intelligence on top of it:**

**Step A: Product Quality Scoring (Using Classified Data)**
- Query `101_active_products` vector collection (already filtered, organized from Phase 0)
- Simple quality scoring: `(views * 0.4) + (purchases * 0.6) + (new_product_boost * 0.2)`
- Category-based trending: Top products per category, updated hourly
- Store in Redis: `101:trending:{category}`, `101:homepage:trending`
- **Result:** Fast scoring using pre-filtered active products

**Files:**
- `/api-service/src/services/productScoring.js` (NEW)
- `/api-service/src/jobs/trendingCacheJob.js` (NEW - runs hourly)

**Step B: User Profile Builder (Using Classified Data)**
- Query `131_purchase_history` (completed purchases, classified in Phase 0)
- Query `132_browsing_patterns` (view history, classified in Phase 0)
- Query `133_cart_wishlist` (intent data, classified in Phase 0)
- Extract patterns:
  - Color preferences: Count frequency in purchases/views
  - Style preferences: Abstract vs realistic vs landscape, etc.
  - Price range: Min/max/preferred from purchase history
  - Category affinity: Which categories they engage with most
- Calculate confidence scores (more data = higher confidence)
- Store in Redis: `141:user:{id}:profile` (TTL: 7 days, matches 141 classification)

**Profile Structure:**
```javascript
{
  userId: 123,
  color_preferences: { blue: 0.85, red: 0.20, green: 0.45 },
  style_preferences: { abstract: 0.75, landscape: 0.60, portrait: 0.30 },
  price_range: { min: 100, max: 500, preferred: 250 },
  category_affinity: { paintings: 0.90, sculptures: 0.30, prints: 0.50 },
  confidence: 0.82,
  data_points: 156,
  last_updated: "2025-01-23T02:00:00Z"
}
```

**Files:**
- `/api-service/src/services/userProfileBuilder.js` (new)
- `/api-service/src/jobs/profileBuilderJob.js` (new - runs nightly at 2am)

**Step C: Personalized Recommendation Engine (Combining Classified Data)**
- For each user with profile (confidence > 0.5):
  - Load their profile: `141:user:{id}:profile` from Step B
  - Query `101_active_products` collection (organized in Phase 0)
  - Score products against user preferences
  - Apply collaborative filtering using `131_purchase_history` patterns
  - Rank by combined score
  - Take top 20 products
  - Store in Redis: `141:user:{id}:recs` (TTL: 24h)
- For users without profiles: Use `101:trending` from Step A

**Scoring Logic:**
```javascript
score = (
  color_match * 0.30 +           // Does product color match user preference?
  style_match * 0.25 +            // Does style match user taste?
  category_match * 0.20 +         // Is it in their preferred categories?
  price_fit * 0.15 +              // Is price in their range?
  collaborative_signal * 0.10     // Do similar users like this?
) * quality_score                 // From Step A
```

**Files:**
- `/api-service/src/services/recommendationEngine.js` (new)
- `/api-service/src/jobs/recommendationJob.js` (new - runs nightly at 3am)

---

#### 1.2 Tier 1: Fast Retrieval Layer (Week 2)

**Serve pre-computed intelligence instantly**

**Implementation:**
```javascript
// /api-service/src/routes/leo.js - Completely rewritten
router.post('/recommendations', async (req, res) => {
  const { userId = 'anonymous', limit = 6 } = req.body;
  
  // Strategy 1: Personalized (pre-computed last night)
  if (userId !== 'anonymous') {
    const cached = await redis.get(`user:${userId}:homepage_recs`);
    if (cached) {
      return res.json({
        products: JSON.parse(cached).slice(0, limit),
        source: 'personalized',
        response_time_ms: 5
      });
    }
  }
  
  // Strategy 2: Trending (updated hourly)
  const trending = await redis.get('homepage:trending');
  if (trending) {
    return res.json({
      products: JSON.parse(trending).slice(0, limit),
      source: 'trending',
      response_time_ms: 10
    });
  }
  
  // Strategy 3: SQL fallback (fast, no AI)
  const products = await db.query(`
    SELECT id, name, price, image_url 
    FROM products 
    WHERE status='active' AND image_url IS NOT NULL AND inventory > 0
    ORDER BY (view_count * 0.4 + purchase_count * 0.6) DESC
    LIMIT ?
  `, [limit]);
  
  return res.json({
    products,
    source: 'sql_fallback',
    response_time_ms: 30
  });
});
```

**Waterfall Strategy:**
1. **Personalized recs** (5ms) - Best quality, user-specific
2. **Trending cache** (10ms) - Good quality, popular items
3. **SQL fallback** (30ms) - Guaranteed results, basic quality

**Result:**
- P50: ~5ms (cache hit)
- P95: ~50ms (fallback)
- P99: ~100ms (SQL query)

**Files:**
- `/api-service/src/config/redis.js` (new)
- `/api-service/src/routes/leo.js` (completely rewrite)
- `/components/index/VisualDiscoveryBand.js` (minimal changes - same API)

---

#### 1.3 Search Enhancement (Week 3)

**Apply user profiles to search results**

**Current:** Same search results for everyone  
**New:** Load user profile, boost results that match their preferences

**Implementation:**
- Search runs normal SQL query with user's search terms
- Load user profile from Redis (if exists)
- Re-rank results:
  - Products matching user's color prefs → +20% score
  - Products in user's favorite categories → +15% score
  - Products in user's price range → +10% score
- Return ranked results

**Files:**
- `/api-service/src/routes/search.js` (modify to load profiles)
- `/api-service/src/services/searchRanking.js` (new)

---

#### Phase 1 Success Criteria

**Performance:**
- ✅ Homepage recommendations load < 50ms (P95)
- ✅ Search results < 200ms (P95)
- ✅ Redis cache hit rate > 70%
- ✅ Zero "no results" failures (SQL fallback works)

**Quality:**
- ✅ Zero deleted/inactive products returned
- ✅ Zero non-product items (color options, articles) returned
- ✅ User profiles built for > 80% of active users
- ✅ Personalized recs differ from trending by > 30%

**Business:**
- 📈 Homepage bounce rate decrease > 10%
- 📈 Click-through on recommendations > 3%
- 📈 Time on site increase > 15%

**Go/No-Go for Phase 2:** All performance + quality metrics must be green

---

#### Phase 1 Success Criteria

**Performance:**
- ✅ Trending cache generation < 5 min
- ✅ User profile building < 30 min for all users
- ✅ Recommendation generation < 2 hours nightly
- ✅ Redis memory usage < 200MB

**Quality:**
- ✅ User profiles built for > 80% of active users
- ✅ Profile confidence score > 0.7 average
- ✅ Personalized recs use classified data only (no mixed collections)
- ✅ Recommendations differ from trending by > 30%

**Go/No-Go for Phase 2:** All metrics green + recommendations serving in < 50ms

---

### PHASE 2: User Intelligence (Weeks 4-5) 🎯
**Goal:** Enhance profiles with behavioral intelligence

#### 2.1 User Profile Builder Service
**What it does:** Analyzes user behavior to build preference profiles  
**Runs:** Nightly at 2am  
**Analyzes:**
- Purchase history (colors, styles, price patterns)
- Browsing history (categories, artists visited)
- Search history (keywords, filters used)
- Cart behavior (abandoned items, wishlist patterns)

**Profile Structure:**
```javascript
{
  userId: 123,
  color_preferences: { blue: 0.85, red: 0.20, green: 0.45 },
  style_preferences: { abstract: 0.75, landscape: 0.60, portrait: 0.30 },
  price_range: { min: 100, max: 500, preferred: 250, sensitivity: 0.7 },
  category_affinity: { paintings: 0.90, sculptures: 0.30, prints: 0.50 },
  artist_preferences: [45, 87, 123],  // Top preferred artists
  last_updated: "2025-01-23T02:00:00Z",
  confidence: 0.82,
  data_points: 156  // How much data we have
}
```

**Storage:**
- Redis: `user:{id}:profile` (TTL: 7 days)
- Redis: `user:{id}:quick_prefs` (just colors/styles for fast queries)
- Truth DB: Stored as `user_truths` for vector search

**Files:**
- `/api-service/src/services/userProfileBuilder.js` (new)
- `/api-service/src/jobs/profileBuilderJob.js` (new)

#### 2.2 Profile Integration
- Visual Band uses profiles for personalization
- Search applies profile boosts
- Session blending protects long-term preferences

---

### PHASE 3: Chatbot Intelligence (Weeks 5-7) 💬
**Goal:** AI-powered help center that learns and escalates

#### 3.1 Support Knowledge Collection
**New Vector Collection:** `support_knowledge`  
**Contains:**
- Help articles (already ingested from `site_content`)
- Case resolutions (human solutions to problems)
- Common patterns (FAQ-style truths)

**Structure:**
```javascript
{
  type: "case_resolution",
  problem: "User charged twice for same order",
  solution: "Check for duplicate orders, verify both charged, refund second",
  resolution_pattern: "duplicate_order_refund",
  success_rate: 0.95,
  avg_resolution_time: "5 minutes",
  human_solver: "support_agent_12"
}
```

#### 3.2 Chatbot Service Architecture
```
User Query
  ↓
Chatbot Router (determines complexity)
  ↓
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  Simple     │   Article    │    Smart     │   Complex    │
│  Response   │   Search     │   Answer     │   Escalate   │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ "How do I   │ Vector search│ Query support│ Open case +  │
│  signup?"   │ articles,    │ truths, infer│ notify human │
│             │ return link  │ solution     │              │
│ <50ms       │ <200ms       │ <1s          │ <2s          │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

#### 3.3 Escalation Ladder
1. **Direct answer** - "Signup is at /signup" (simple map)
2. **Article link** - "Here's our guide: [link]" (vector search)
3. **Inferred solution** - "I see you have duplicate orders..." (truth + context)
4. **Human escalation** - "Let me connect you with support..." (case created)

#### 3.4 Learning Loop
```
Human solves case
  ↓
Case resolution stored in SQL
  ↓
Nightly vacuum ingests to vector
  ↓
Truth extraction identifies pattern
  ↓
Next similar query → Chatbot answers directly
```

**Files:**
- `/api-service/src/services/chatbotService.js` (new)
- `/api-service/src/services/caseEscalationService.js` (new)
- `/api-service/src/routes/chatbot.js` (new)
- `/leo/src/collections/supportKnowledge.js` (new collection setup)

---

### PHASE 4: Event-Artist Matching (Weeks 8-10) 🎪
**Goal:** Bi-directional intelligent recommendations

#### 4.1 Unified Fit Scoring Model
**Single calculation serves multiple queries:**
- Artist asks: "Where will I succeed?"
- Promoter asks: "Who should I invite?"
- Leo proactively suggests: "Try this show!"

**Fit Score Calculation:**
```javascript
fitScore = (
  similarArtistSuccess * 0.30 +      // Collaborative filtering
  categoryMatch * 0.25 +              // Event type fits artist
  priceRangeAlignment * 0.15 +        // Artist's prices fit event
  geographicFeasibility * 0.10 +      // Travel distance reasonable
  weatherCompatibility * 0.10 +       // Product type vs weather
  historicalSuccess * 0.10            // Artist's past performance
) * confidenceMultiplier
```

#### 4.2 Implementation
- Nightly job scores all artist-event pairs (or top N candidates)
- Scores stored in Redis: `artist:{id}:event_matches`
- Query time just retrieves and ranks
- Filters applied based on query context

**Files:**
- `/api-service/src/services/eventArtistMatcher.js` (new)
- `/api-service/src/jobs/eventMatchingJob.js` (new)
- `/api-service/src/routes/recommendations.js` (extend)

---

### PHASE 5: Traffic Analysis & Beacon Data (Weeks 11-13) 📍
**Goal:** Physical world intelligence

#### 5.1 Beacon Data Ingestion
**New SQL Tables:**
- `beacon_events` (raw proximity data)
- `beacon_dwell_times` (aggregated per user per booth)
- `beacon_paths` (user movement patterns)

**Vector Collection:** Beacon events ingested for pattern discovery

#### 5.2 Intelligence Unlocks
1. **User Preferences:** Dwell time → implicit interest signals
2. **Artist Similarity:** "People who visit A also visit B"
3. **Layout Optimization:** Heat maps for promoters
4. **Discovery Patterns:** How do people find new artists?

#### 5.3 Privacy Considerations
- Opt-in only via app
- Anonymized aggregations
- No real-time tracking displays
- 30-day data retention

---

### PHASE 6: Business Intelligence (Weeks 14-16) 📊
**Goal:** Actionable insights for vendors and promoters

#### 6.1 Pattern-Based Advice
**Example:** "Vendors who extend returns to 30 days see 20% sales increase"

**How it works:**
```javascript
// Analyze all vendors
const vendors = await db.query(`
  SELECT vendor_id, return_window, 
         AVG(sales_6mo_before) as before,
         AVG(sales_6mo_after) as after
  FROM vendor_policy_changes
  WHERE policy_type = 'return_window'
`);

// Find pattern
const extended = vendors.filter(v => v.return_window >= 30);
const avgIncrease = extended.reduce((sum, v) => 
  sum + ((v.after - v.before) / v.before), 0
) / extended.length;

// Store as truth
if (avgIncrease > 0.15 && extended.length > 10) {
  await truthDB.storeTruth('pattern_truths', {
    content: `Extending return window to 30+ days correlates with ${(avgIncrease*100).toFixed(0)}% sales increase`,
    confidence: calculateConfidence(extended.length, variance),
    evidence_count: extended.length
  });
}
```

#### 6.2 Chatbot Integration
Vendor asks: "How do I increase sales?"  
Chatbot queries truths → finds return window pattern → suggests try it

---

### PHASE 7: Content Assistance (Weeks 17+) ✍️
**Goal:** AI-powered writing help

#### 7.1 Product Description Enhancement
- Analyze successful product descriptions
- Suggest improvements to vendor's drafts
- A/B test AI vs human descriptions

#### 7.2 Event Listing Optimization
- Extract what makes listings convert
- Suggest title improvements
- Optimize for discovery

---

### Scale Milestones & Triggers

| User Count | Action Required | Infrastructure Changes |
|------------|-----------------|------------------------|
| **<1,000** | Current: Single server | None needed |
| **1,000-10,000** | Monitor Redis memory | Consider dedicated Redis server |
| **10,000-100,000** | Hire senior engineer | Distribute: API/Leo/Redis separate servers |
| **100,000-1M** | Horizontal scaling | Load balancers, multiple Leo instances |
| **1M+** | Enterprise architecture | Kubernetes, multi-region, CDN |

**Current Status:** Phase 0 → Phase 1 transition (~200 users)

---

## Future Expansion

### Easy Extensions
- **New Query Types**: Add to Llama analysis prompts
- **New Data Sources**: Add collections to vector search
- **New Intelligence**: Enhance truth extraction patterns
- **New Components**: All use same Central Brain endpoint

### Scalability
- **Horizontal**: Multiple brain instances behind load balancer
- **Vertical**: Enhanced Llama models for better intelligence
- **Data**: Additional vector databases for specialized content

---

## Decision Log

### Why We Made Key Architectural Choices

This section documents major decisions and their rationale. Future developers can understand *why* things are built this way.

#### Decision 1: Hybrid SQL + Vector Architecture (Not Pure Vector)

**Decision:** Use SQL for structured queries + Vectors for semantic search  
**Date:** January 2025  
**Rationale:**
- SQL excels at exact filtering (status='active', price < 500)
- Vectors excel at semantic similarity ("abstract blue art")
- Combined approach is faster and more accurate than either alone
- No need to rebuild existing SQL infrastructure
- Allows incremental adoption of AI features

**Alternative Considered:** Pure vector database with all data  
**Why Rejected:** Loses precision for exact matches, requires full rebuild

---

#### Decision 2: Three-Tier Processing (Fast/Smart/Deep)

**Decision:** Separate layers for <50ms, <2s, and batch processing  
**Date:** January 2025  
**Rationale:**
- Above-fold content (homepage) needs instant response
- Interactive features (search, chatbot) can tolerate brief delays
- Complex analysis (profiles, insights) doesn't need real-time
- Optimizing each tier independently is more efficient than one-size-fits-all

**Alternative Considered:** Real-time for everything  
**Why Rejected:** Too expensive computationally, unnecessary for many use cases

---

#### Decision 3: Nightly Profiles + Session Boosts (Not Pure Real-time)

**Decision:** Rebuild profiles nightly, apply temporary session adjustments  
**Date:** January 2025  
**Rationale:**
- True preferences are stable (take days/weeks to change)
- Session interests are temporary (gift shopping ≠ personal taste)
- Nightly rebuild allows complex multi-source analysis
- Session boosts provide immediate responsiveness
- Prevents profile pollution from temporary behaviors

**Alternative Considered:** Update profiles in real-time  
**Why Rejected:** 
- Expensive to recompute constantly
- Temporary behaviors would corrupt long-term profiles
- TikTok comparison misleading (they have 1000s of engineers for real-time)

---

#### Decision 4: Raw + Interpreted Truths (Not Just Interpreted)

**Decision:** Store both raw observations and AI interpretations  
**Date:** January 2025  
**Rationale:**
- Raw data is ground truth, never wrong
- Interpretations can be incorrect and need revalidation
- Raw data preserves precision (14 minutes vs 2 minutes matters)
- Allows reinterpretation as AI models improve
- Debugging requires seeing original data

**Alternative Considered:** Only store interpreted patterns  
**Why Rejected:** Loss of precision, can't validate or reinterpret later

---

#### Decision 5: Start Simple, Scale Later (Not Distributed from Day 1)

**Decision:** Single server now, distribute when revenue allows hiring engineer  
**Date:** January 2025  
**Rationale:**
- Current scale (~200 users) doesn't need distribution
- Premature optimization wastes development time
- Distributed systems are much harder to debug
- Revenue should fund proper engineering (not DIY distribution)
- Code designed to be distributable (stateless, queue-based)

**Alternative Considered:** Build distributed from start  
**Why Rejected:** 
- Unnecessary complexity for current scale
- Would delay feature delivery
- "Start simple" philosophy: prove value, then scale

---

#### Decision 6: Unified Models with Multiple Interfaces (Not Separate Models per Query)

**Decision:** Artist-event fit is one calculation, queried from different angles  
**Date:** January 2025  
**Rationale:**
- "Where should I perform?" and "Who should I invite?" are the same problem
- Maintaining multiple models for same problem is wasteful
- Single model ensures consistency
- Different interfaces (artist view vs promoter view) are just filters/sorts

**Alternative Considered:** Separate models for artist queries vs promoter queries  
**Why Rejected:** Duplication of effort, inconsistent results, hard to maintain

---

#### Decision 7: Support Collection with Case Learning (Not Static FAQs)

**Decision:** Chatbot learns from human case resolutions, not just pre-written articles  
**Date:** January 2025  
**Rationale:**
- Real problems aren't always in documentation
- Human solutions reveal actual user issues
- System gets smarter over time without manual updates
- Creates feedback loop: problem → human → pattern → automation

**Alternative Considered:** Static FAQ database  
**Why Rejected:** Doesn't improve over time, can't handle novel problems

---

#### Decision 8: Rebuild from Foundation, Don't Patch Broken System

**Decision:** Phase 1 bypasses existing Leo/Llama system entirely, builds SQL+Redis intelligence from scratch  
**Date:** January 23, 2025  
**Rationale:**
- Existing system fundamentally broken (2+ min load times, returns garbage results)
- Llama 3.2 too slow for real-time use, vector search pulling wrong data types
- Caching broken results doesn't solve underlying quality issues
- SQL database has all needed data, is fast and reliable
- 95% of recommendation value achievable with SQL + basic algorithms
- Prove intelligence works simply, THEN add AI enhancement where valuable
- Users need working system NOW, not "eventually after we debug Llama"

**Implementation Path:**
1. **Week 1:** Build overnight jobs (product scoring, user profiles, recommendations)
2. **Week 2:** Fast Redis retrieval layer with waterfall fallbacks
3. **Week 3:** Apply profiles to search results
4. **Later Phases:** Add AI models incrementally (semantic search, chatbot, deep learning)

**Alternative Considered:** Cache existing Llama results to speed them up  
**Why Rejected:**
- Doesn't fix quality issues (still returns deleted/wrong items)
- Still relies on broken Llama responses
- Caching garbage results faster isn't a solution
- Band-aid approach prevents addressing root problems

**This Changes:**
- Phase 1 no longer uses Central Brain or Llama
- Vector databases dormant until Phase 2+
- Truth extraction deferred until data quality proven
- AI becomes enhancement layer, not foundation layer

**Success Metric:** If Phase 1 fails to deliver fast, quality results with SQL alone, the AI approach was never going to work anyway

---

## Technical Specifications

### Redis Key Schema & Memory Estimates

**User-Specific Keys:**
```
user:{userId}:profile                 TTL: 7d    ~5KB    (full preference profile)
user:{userId}:homepage_recs           TTL: 24h   ~2KB    (pre-computed homepage products)
user:{userId}:quick_prefs             TTL: 7d    ~500B   (just colors/styles for fast queries)
user:{userId}:session_boosts          TTL: 6h    ~300B   (temporary interests this session)
```

**Global Caches:**
```
homepage:trending                     TTL: 1h    ~10KB   (hot products right now)
homepage:featured                     TTL: 6h    ~10KB   (curated featured products)
artist:{artistId}:event_matches       TTL: 24h   ~3KB    (pre-scored event recommendations)
event:{eventId}:artist_matches        TTL: 24h   ~5KB    (pre-scored artist invitations)
```

**Support/Chatbot:**
```
chatbot:faq_cache                     TTL: 1h    ~20KB   (common questions/answers)
support:case_patterns                 TTL: 24h   ~15KB   (known resolution patterns)
```

**Memory Calculations:**
- **10,000 users** × 8KB average = ~80MB
- **Global caches:** ~100MB
- **Overhead & fragmentation:** ~50MB
- **Total:** ~230MB for 10K users

**At 100K users:** ~2.5GB  
**At 1M users:** ~25GB (need Redis Cluster or separate server)

---

### Vector Collection Structure

**Main DB (Port 8000) - Organized by Classification:**
```
101_active_products
  ├─ Active products for customer recommendations
  ├─ Filter: status='active', deleted_at IS NULL, has images
  ├─ ~5K-50K documents
  └─ Primary use: Shopping, search results, homepage

102_deleted_products
  ├─ Recently deleted products for trend analysis
  ├─ Includes deletion_date, reason metadata
  ├─ ~2K-20K documents
  └─ Primary use: Trend death detection, market analysis

103_draft_products
  ├─ Products in draft/pending status
  ├─ ~1K-10K documents
  └─ Primary use: Inventory prediction, artist engagement

131_purchase_history
  ├─ User purchase patterns (aggregated)
  ├─ ~10K-100K patterns
  └─ Primary use: Preference learning, collaborative filtering

132_browsing_patterns
  ├─ User viewing and interaction behaviors
  ├─ ~50K-500K patterns
  └─ Primary use: Interest detection, conversion analysis

301_beacon_data
  ├─ Physical dwell time and booth visits
  ├─ ~5K-50K events (aggregated by user/artist)
  └─ Primary use: Physical interest signals, layout optimization

302_event_performance
  ├─ Event outcomes and success metrics
  ├─ ~1K-10K events
  └─ Primary use: Artist-event matching, success prediction

402_published_content
  ├─ Published articles, help docs, blog posts
  ├─ ~1K-5K documents
  └─ Primary use: Chatbot knowledge, help center

501_support_cases (Phase 3)
  ├─ Resolved support cases and solutions
  ├─ ~2K-10K entries
  └─ Primary use: Chatbot training, pattern detection
```

**Truth DB (Port 8001) - Synthesized Intelligence:**
```
141_user_preferences
  ├─ Per-user preference profiles (synthesized from 131, 132, 301)
  ├─ "User 123 prefers glass art, blue colors, $200-500"
  ├─ ~10K-100K profiles (one per active user)
  └─ Cached in Redis for fast access

behavioral_truths
  ├─ Universal behavior patterns
  ├─ "Dwell time > 10min indicates strong interest"
  └─ ~1K-5K patterns

content_truths
  ├─ Product/content correlations
  ├─ "Blue products correlate with ceramics interest"
  └─ ~5K-20K correlations

pattern_truths
  ├─ Business intelligence patterns
  ├─ "Rain events = 30% lower paper product sales"
  └─ ~500-2K patterns

temporal_truths
  ├─ Time-based patterns and seasonal trends
  ├─ "Spring = +40% landscape painting preference"
  └─ ~200-1K seasonal patterns
```

**Note:** Collection names match DATA_CLASSIFICATION.md codes for automatic query routing. When classification tags change (e.g., product goes from 101→102), vector DB automatically re-indexes to appropriate collection.

---

### Performance Targets by Phase

| Metric | Current | Phase 1 | Phase 2 | Phase 3+ |
|--------|---------|---------|---------|----------|
| **Homepage Load (P50)** | 800ms | 10ms | 10ms | 10ms |
| **Homepage Load (P95)** | 2000ms | 50ms | 50ms | 50ms |
| **Search Results (P50)** | 300ms | 150ms | 100ms | 80ms |
| **Search Results (P95)** | 1500ms | 400ms | 250ms | 200ms |
| **Chatbot Response (P50)** | N/A | N/A | N/A | 400ms |
| **Chatbot Response (P95)** | N/A | N/A | N/A | 1200ms |
| **Cache Hit Rate** | 0% | 70% | 85% | 90% |
| **Recommendation Accuracy** | Low | Low | High | Very High |
| **User Satisfaction (NPS)** | TBD | TBD | +10 | +20 |

---

### Nightly Job Schedule

**2:00 AM - 4:00 AM: Heavy Processing Window**
```
2:00 - 2:30    User Profile Builder (all active users)
2:30 - 3:00    Truth Extraction & Validation
3:00 - 3:30    Event-Artist Fit Scoring (Phase 4+)
3:30 - 4:00    Business Intelligence Pattern Discovery (Phase 6+)
```

**4:00 AM - 5:00 AM: Recommendation Generation**
```
4:00 - 5:00    Multi-model ensemble recommendations for all users
               (Collaborative + Visual + Behavioral + Trending)
```

**Hourly: Fast Caches**
```
:00 every hour    Trending products cache refresh
:30 every hour    Featured products cache refresh
```

**Every 6 hours: Support Knowledge**
```
6AM, 12PM, 6PM, 12AM    Support case ingestion and pattern extraction
```

---

## Success Metrics

### Phase 1 Success Criteria (Foundation & Speed)

**Performance Metrics:**
- ✅ Visual Band loads < 50ms (P95)
- ✅ Cache hit rate > 70%
- ✅ Zero failed page loads
- ✅ Redis memory usage < 100MB

**Business Metrics:**
- 📈 Homepage bounce rate decrease > 5%
- 📈 Time on site increase > 10%
- 📈 Click-through on recommendations > 2%

**Go/No-Go for Phase 2:** All performance metrics must be green

---

### Phase 2 Success Criteria (User Intelligence)

**Quality Metrics:**
- ✅ User profiles built for > 80% of active users
- ✅ Profile confidence score > 0.7 average
- ✅ Personalized results differ from generic by > 30%

**Engagement Metrics:**
- 📈 Repeat visitor engagement + 15%
- 📈 Add-to-cart from recommendations + 10%
- 📈 User session length + 20%

**Go/No-Go for Phase 3:** Profiles demonstrate measurable personalization improvement

---

### Phase 3 Success Criteria (Chatbot Intelligence)

**Chatbot Performance:**
- ✅ Answer success rate > 60% (user doesn't escalate)
- ✅ Average response time < 500ms
- ✅ Case escalation rate < 40%
- ✅ User satisfaction rating > 4.0/5.0

**Learning Metrics:**
- 📈 Case auto-resolution rate increases 5% per month
- 📈 Unique problem patterns discovered > 50
- 📈 Support ticket volume decreases 10%

---

### Long-term Success Indicators (All Phases)

**Intelligence Quality:**
- Recommendation click-through rate > 8% (industry standard: 2-3%)
- Personalization accuracy > 75% (user agrees with suggestions)
- Truth extraction confidence > 0.8 average
- Model drift < 5% per quarter (predictions stay accurate)

**Business Impact:**
- Revenue from recommendations > 20% of total
- Customer lifetime value increase > 30%
- User retention (90-day) > 60%
- NPS score > +50

**Technical Health:**
- System uptime > 99.5%
- P95 response times meet targets across all features
- Redis memory efficiency (actual vs predicted) within 20%
- Zero data loss incidents
- Truth database growing steadily (indicates learning)

---

## Troubleshooting

### Common Issues
1. **No Results**: Check vector database health and data ingestion
2. **Poor Results**: Review truth extraction and behavioral patterns
3. **Slow Responses**: Monitor Llama response times and vector query performance
4. **Inconsistent Results**: Verify truth application and confidence thresholds

### Monitoring
- **Health Checks**: `/api/leo/health` for system status
- **Logs**: Check `leo/logs/` for detailed operation logs
- **Stats**: Vector database statistics for data health
- **Performance**: Response times and query analysis success rates

---

## Migration Notes

### From Old Architecture
- **Multiple Endpoints** → Single Brain endpoint
- **Hardcoded Logic** → Llama-driven decisions  
- **Mixed Responsibilities** → Clean separation
- **Complex Components** → Simple ID-based fetching

### Backward Compatibility
- Existing SQL APIs remain unchanged
- Frontend components updated to use brain
- Old endpoints deprecated but not immediately removed
- Gradual migration component by component

---

## Quick Reference for Daily Development

### When Adding a New Feature, Ask:

1. **Which classifications needed?** Check DATA_CLASSIFICATION.md for relevant data types
2. **Which tier?** Fast (<50ms)? Smart (<2s)? Deep (batch)?
3. **What data needed?** SQL only? Vectors? Both? Truths?
4. **Real-time or cached?** Can it be pre-computed?
5. **User-specific or global?** Affects caching strategy
6. **Learning loop?** Does this teach Leo something new?

### When Adding New Data Types:

1. **Consult DATA_CLASSIFICATION.md** - Does it fit existing classification?
2. **Extend with decimals** - Add `101.6` rather than creating new 100-level category
3. **Tag data with classification** - System auto-routes to correct collection
4. **Document use cases** - What queries should examine this data?
5. **Set context rules** - Should this be examined always or only when contextually relevant?

### Common Development Patterns

**Pattern 1: Adding a new recommendation type**
```javascript
// 1. Create nightly job to pre-compute
// 2. Store in Redis with appropriate TTL
// 3. Create service to retrieve with fallbacks
// 4. Update frontend component to display
```

**Pattern 2: Adding new data source**
```javascript
// 1. Ensure SQL tables indexed properly
// 2. Update vacuum-ingestion.js to include new table
// 3. Add to appropriate vector collection
// 4. Create truths from patterns if needed
// 5. Update relevant services to query new data
```

**Pattern 3: Adding chatbot capability**
```javascript
// 1. Add knowledge to support_knowledge collection
// 2. Create truth patterns for common scenarios
// 3. Update chatbot router to recognize query type
// 4. Add fallback to human escalation
// 5. Log resolutions for future learning
```

### File Locations Cheat Sheet

**Need to modify recommendation logic?**  
→ `/api-service/src/services/visualBandService.js`

**Need to change user profile structure?**  
→ `/api-service/src/services/userProfileBuilder.js`

**Need to add new vector collection?**  
→ `/leo/src/core/vectorDatabase.js` (Main) or `truthVectorDatabase.js` (Truth)

**Need to change caching strategy?**  
→ `/api-service/src/config/redis.js`

**Need to modify data ingestion?**  
→ `/leo/vacuum-ingestion.js`

**Need to add nightly job?**  
→ `/api-service/src/jobs/` (create new file)

### Redis Key Patterns

```bash
# User data
redis-cli GET user:123:profile
redis-cli GET user:123:homepage_recs
redis-cli TTL user:123:profile

# Global caches
redis-cli GET homepage:trending
redis-cli GET homepage:featured

# Debug commands
redis-cli INFO memory
redis-cli KEYS user:*:profile | wc -l  # Count user profiles
redis-cli DBSIZE  # Total keys
```

### Vector DB Queries

```bash
# Health check
curl http://localhost:8000/api/v1/heartbeat

# Check collections
curl http://localhost:8000/api/v1/collections

# Query main DB
curl -X POST http://localhost:8000/api/v1/collections/art_metadata/query \
  -d '{"query_texts": ["abstract blue art"], "n_results": 5}'

# Check truth DB
curl http://localhost:8001/api/v1/heartbeat
```

### Common Debugging Steps

**Problem: Homepage slow**
1. Check Redis hit rate: `redis-cli INFO stats | grep keyspace_hits`
2. Check if trending cache exists: `redis-cli GET homepage:trending`
3. Check API logs for cache misses
4. Verify nightly jobs ran successfully

**Problem: Recommendations not personalized**
1. Check if user profile exists: `redis-cli GET user:123:profile`
2. Verify profile builder ran: Check logs at `/api-service/logs/`
3. Check truth database has user_truths
4. Verify search service loads profiles

**Problem: Chatbot not learning**
1. Check support_knowledge collection exists
2. Verify case resolutions being stored in SQL
3. Check vacuum ingestion running nightly
4. Verify truth extraction processing support cases

### Performance Monitoring

```bash
# Response time distribution
tail -f /api-service/logs/access.log | grep "visual-band" | awk '{print $4}'

# Cache hit rate
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Memory usage
redis-cli INFO memory | grep used_memory_human

# Vector DB stats
curl http://localhost:8000/api/v1/collections/art_metadata | jq '.count'
```

---

## Document Maintenance

**Last Updated:** January 23, 2025  
**Major Revision:** Rebuild strategy (bypassing broken Llama system)  
**Current Phase:** Phase 0 → Phase 1 (Foundation Intelligence)  
**Next Review:** After Phase 1 completion  

**Recent Changes:**
- **Jan 23, 2025 (Major Revision)**: Complete rebuild with data-first approach
  - **Phase 0 (NEW):** Data Classification & Ingestion comes FIRST
    - Organize all data using Dewey Decimal classification system
    - Update vacuum-ingestion.js to classify and route data properly
    - Wipe and rebuild vector database with organized collections
    - Result: Clean, organized data foundation
  - **Phase 1 (REVISED):** SQL Intelligence Engine built ON classified data
    - Query classified collections (101_active_products, not mixed art_metadata)
    - Build user profiles from classified behavior data (131, 132, 133)
    - Store intelligence in classification-aligned Redis keys
  - **Data Classification System:** Created Dewey Decimal-style catalog (DATA_CLASSIFICATION.md)
    - All data organized by purpose (100=Products, 130=User Behavior, 300=Events, 200=Environmental)
    - Vector collections match classification codes (101_active_products, 102_deleted_products)
    - Data moves between classifications via tag changes (no deletion)
    - Context-specific data (200 series) only queried when relevant
    - Removed duplicate 750 series (consolidated to 200 series)
  - **Decision 8:** Documented rebuild rationale
  - **Updated Sections:** All phases reordered, system flow simplified, removed Llama dependencies from early phases

**Update this document when:**
- Major architectural decisions are made
- New phases begin implementation
- Performance targets change
- Scale milestones are reached
- New data sources are added
- Rebuild strategies shift

---

*This architecture enables Leo AI to become increasingly intelligent over time, starting with proven simple technology (SQL + Redis) and progressively adding AI enhancement where it delivers measurable value.*

**The Foundation-First Philosophy:**
1. Prove intelligence works with SQL + basic algorithms
2. Add lightweight AI models for semantic enhancement
3. Add complex AI for pattern discovery
4. Scale intelligence as user base grows

**Key Principle:** AI enhances intelligence, it doesn't create it. The data creates intelligence. AI helps us find patterns in that data faster.

---

**END OF ARCHITECTURE DOCUMENT**

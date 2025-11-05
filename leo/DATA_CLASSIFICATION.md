# Leo AI - Data Classification System
## The Master Catalog for All Platform Data

> **Purpose:** This document organizes ALL data types by purpose and use case. Think of it as the Dewey Decimal System for our platform - a human-readable catalog that also guides Leo's intelligence queries.

---

## How to Use This Document

**For Humans:**
- Quick reference: "What data do we have?"
- Planning: "What can we do with X data type?"
- Troubleshooting: "Why is Leo returning wrong results?" (check if right classification was queried)

**For Leo AI:**
- Query routing: "User wants shopping results → query `active_products` classification"
- Cross-referencing: "Trend analysis → combine `deleted_products` + `user_searches`"
- Automatic filtering: Read classification rules instead of hardcoded logic

---

## Classification Structure

Each data type has:
- **Classification Code** (like Dewey Decimal numbers)
- **Data Type Name** (human-readable)
- **Storage Location** (SQL table, vector collection, Redis key)
- **Primary Purpose** (what it's FOR)
- **Use Cases** (specific intelligence applications)
- **Exclusions** (what NOT to use it for)
- **Related Classifications** (what to combine it with)

---

# PRODUCT DATA (100 Series)

## 101: Active Products
**Storage:** SQL `products` table (status='active'), Vector `active_products`  
**Filter Rules:** 
- status = 'active'
- deleted_at IS NULL
- image_url IS NOT NULL
- inventory > 0 OR inventory_tracked = false

**Primary Purpose:** Customer-facing product discovery and shopping

**Use Cases:**
- Homepage recommendations
- Search results
- "You might like" suggestions
- Visual discovery band
- Category browsing
- Artist storefront displays

**Exclusions:**
- DO NOT use for trend analysis (only shows current, not what's dying)
- DO NOT use for market gap analysis (doesn't show what's missing)

**Related Classifications:**
- Combine with `131: User Purchase History` for personalized recommendations
- Combine with `141: User Preferences` for preference matching
- Combine with `301: Beacon Dwell Data` for interest confirmation

---

## 102: Deleted Products
**Storage:** SQL `products` table (deleted_at IS NOT NULL), Vector `deleted_products`  
**Filter Rules:**
- deleted_at IS NOT NULL
- Include metadata: deletion_date, artist_id, reason (if available)

**Primary Purpose:** Trend death detection and market shift analysis

**Use Cases:**
- Spotting dying trends ("15 artists deleted red square paintings in 60 days")
- Warning artists about declining markets
- Identifying oversaturated niches
- Market timing intelligence ("Spring = watercolors deleted, winter = watercolors return")
- Historical trend analysis

**Exclusions:**
- DO NOT show to customers as shopping options
- DO NOT use for "similar products" recommendations

**Related Classifications:**
- Combine with `101: Active Products` to find trend shifts
- Combine with `151: Search Queries` to find demand gaps ("people search for what's deleted")
- Combine with `202: Weather Data` for seasonal pattern discovery

**Intelligence Example:**
```
Query: "What trends are dying?"
→ Check 102: Deleted Products (last 90 days)
→ Group by style + color
→ Find clusters with >10 deletions
→ Result: "Abstract red squares dying (23 deletions)"
```

---

## 103: Draft/Pending Products
**Storage:** SQL `products` table (status='draft' OR status='pending')  
**Filter Rules:**
- status IN ('draft', 'pending')
- Include: created_date, last_modified, completion_percentage

**Primary Purpose:** Artist behavior analysis and inventory prediction

**Use Cases:**
- Predicting upcoming inventory ("50 landscape paintings in draft = spring surge coming")
- Artist engagement patterns ("Artists who complete drafts within 7 days sell 40% more")
- Marketplace gap identification ("Nobody drafting ceramics = opportunity")
- Artist support triggers ("Draft sitting 30+ days = send completion tips")

**Exclusions:**
- DO NOT show to customers
- DO NOT use in public-facing recommendations

**Related Classifications:**
- Combine with `101: Active Products` to predict category growth
- Combine with `151: Search Queries` to match supply with demand

---

## 104: Product Variants & Options
**Storage:** SQL `product_options`, `product_variants` tables, Vector `product_metadata`  
**Filter Rules:**
- Type: color_options, size_options, material_options, style_variants
- Must reference parent product_id

**Primary Purpose:** Preference signal strength and variant intelligence

**Use Cases:**
- Strong preference detection ("User chose blue from 5 colors = 0.8 blue preference")
- Weak preference detection ("Product only comes in blue = 0.3 blue preference")
- Variant performance analysis ("Blue sells 3x better than red in landscapes")
- Inventory guidance ("Offer more color options = +25% conversion")

**Exclusions:**
- DO NOT treat as standalone products
- DO NOT recommend options, recommend parent products

**Related Classifications:**
- Always link to `101: Active Products` (parent product)
- Combine with `131: Purchase History` for weighted preference learning

**Intelligence Example:**
```
User views painting with 5 color options
User selects "Ocean Blue"
→ Log to 141: User Preferences with strength=0.8 (active choice)
vs.
User buys painting that only comes in blue
→ Log to 141: User Preferences with strength=0.3 (passive)
```

---

## 105: Product Images & Visual Data
**Storage:** SQL `product_images`, Vector `visual_embeddings`, Image analysis metadata  
**Filter Rules:**
- image_url IS NOT NULL
- Include: dominant_colors, detected_styles, composition_analysis

**Primary Purpose:** Visual similarity and style-based recommendations

**Use Cases:**
- "More like this" visual recommendations
- Color palette matching
- Style transfer suggestions ("You like these abstract patterns → try geometric")
- Visual search ("Find products that look like this photo")
- Aesthetic trend tracking

**Related Classifications:**
- Link to `101: Active Products` or `102: Deleted Products`
- Combine with `141: User Preferences` for visual taste profiling

---

# USER BEHAVIORAL DATA (130 Series)

## 131: User Purchase History
**Storage:** SQL `orders`, `order_items` tables, Vector `purchase_patterns`  
**Filter Rules:**
- Include all completed purchases
- Include: product_id, purchase_date, price_paid, quantity

**Primary Purpose:** Preference learning and recommendation personalization

**Use Cases:**
- Building user preference profiles (colors, styles, price ranges)
- "Customers who bought X also bought Y"
- Repeat purchase prediction
- Lifetime value calculation
- Seasonal behavior patterns

**Related Classifications:**
- Primary source for `141: User Preferences`
- Combine with `101: Active Products` for "buy again" suggestions
- Combine with `301: Beacon Data` for online + offline behavior correlation

---

## 132: Browsing & View History
**Storage:** SQL `product_views`, Vector `browsing_patterns`  
**Filter Rules:**
- Include: product_id, user_id, timestamp, duration, device_type

**Primary Purpose:** Interest detection and early-stage preference signals

**Use Cases:**
- Identifying consideration set (what they're thinking about buying)
- Browse-to-buy conversion patterns
- Interest intensity measurement (repeat views = higher interest)
- Discovery pattern analysis (how do users find new products?)

**Exclusions:**
- Weaker signal than purchases (weight lower in preference algorithms)

**Related Classifications:**
- Supplement `131: Purchase History` with pre-purchase intent
- Combine with `301: Beacon Data` for cross-channel behavior

---

## 133: Cart & Wishlist Behavior
**Storage:** SQL `cart_items`, `wishlist_items`, Vector `intent_patterns`  
**Filter Rules:**
- Include: added_date, abandoned (yes/no), purchased (yes/no)

**Primary Purpose:** Intent detection and conversion optimization

**Use Cases:**
- Abandoned cart recovery
- Price sensitivity detection ("Added at $500, didn't buy, bought at $400 = max price $450")
- Gift shopping detection (wishlist shares)
- Purchase timeline prediction ("Usually buys within 7 days of cart add")

**Related Classifications:**
- Bridge between `132: Browsing` and `131: Purchases`
- Combine with `141: Preferences` for targeted recovery campaigns

---

## 141: User Preference Profiles
**Storage:** Redis `user:{id}:profile`, Vector `user_truths`  
**Filter Rules:**
- Built from 131, 132, 133, 301 (synthesized intelligence)
- Include confidence scores, data_point_count, last_updated

**Primary Purpose:** Fast preference lookup for real-time personalization

**Use Cases:**
- Homepage personalization
- Search result ranking
- Recommendation filtering
- Session-specific boosts (temporary interests)

**Related Classifications:**
- Synthesized FROM: 131, 132, 133, 301, 104
- Used WITH: 101 (active products) for matching

**Intelligence Flow:**
```
Nightly: Analyze 131+132+133 → Extract patterns → Store in 141
Real-time: Load 141 → Apply to 101 → Return personalized results
```

---

## 151: Search Queries
**Storage:** SQL `search_logs`, Vector `search_patterns`  
**Filter Rules:**
- Include: query_text, user_id, timestamp, results_clicked, no_results (boolean)

**Primary Purpose:** Demand signal and content gap identification

**Use Cases:**
- SEO & content strategy ("1000 searches for 'watercolor tutorials' = create tutorial")
- Marketplace gaps ("High search volume + low results = opportunity")
- Search result optimization
- Trending topics detection
- Failed search recovery ("No results for X = notify potential sellers")

**Related Classifications:**
- Combine with `101: Active Products` to find gaps (high search, low supply)
- Combine with `102: Deleted Products` to find dead supply (searching for delisted items)
- Combine with `401: Draft Articles` to prioritize content creation

---

# CONTENT DATA (400 Series)

## 401: Draft Articles
**Storage:** SQL `articles` (status='draft'), Vector `draft_content`  
**Filter Rules:**
- status = 'draft'
- Include: topic, created_date, author_id, completion_estimate

**Primary Purpose:** Content opportunity detection and author engagement

**Use Cases:**
- Content gap identification ("15 drafts about 'shipping' = demand signal")
- Author encouragement ("Your audience wants this topic!")
- Topic clustering ("Multiple authors drafting similar = hot topic")
- Content calendar planning

**Exclusions:**
- DO NOT show to customers
- DO NOT use for chatbot answers (not vetted yet)

**Related Classifications:**
- Combine with `151: Search Queries` to prioritize high-demand topics
- Combine with `402: Published Articles` to find gaps in published content

**Intelligence Example:**
```
Query: "What content should we create?"
→ Check 401: Draft Articles (cluster topics)
→ Check 151: Search Queries (what users search for)
→ Check 402: Published Articles (what we already have)
→ Result: "15 drafts + 500 searches for 'shipping art' but only 2 published articles = priority topic"
```

---

## 402: Published Articles
**Storage:** SQL `articles` (status='published'), Vector `published_content`  
**Filter Rules:**
- status = 'published'
- deleted_at IS NULL

**Primary Purpose:** Customer knowledge base and chatbot intelligence

**Use Cases:**
- Chatbot answers to customer questions
- Help center search results
- Related reading recommendations
- SEO content
- Onboarding education

**Exclusions:**
- DO NOT use for author engagement (they already published)

**Related Classifications:**
- Primary source for chatbot responses
- Combine with `501: Support Cases` to identify content gaps

---

# SUPPORT & HELP DATA (500 Series)

## 501: Support Cases & Tickets
**Storage:** SQL `support_cases`, Vector `support_knowledge`  
**Filter Rules:**
- Include: problem_description, resolution_steps, status, resolution_time
- Separate by status: open, resolved, escalated

**Primary Purpose:** Chatbot learning and support automation

**Use Cases:**
- Chatbot training ("Human solved 50 cases about 'refunds' = chatbot learns pattern")
- Problem pattern detection ("20 cases about slow checkout = engineering alert")
- Self-service content gaps ("High case volume + no article = create article")
- Agent performance optimization
- Customer pain point tracking

**Related Classifications:**
- Cases → Train chatbot → Reduce future cases (learning loop)
- Combine with `402: Published Articles` to create missing help docs
- Combine with product data to identify product-specific issues

**Intelligence Example:**
```
Query: "Why are support cases spiking?"
→ Check 501: Recent Cases (cluster by topic)
→ Result: "45 cases about 'shipping delays' in 7 days"
→ Action: Create broadcast announcement + add to 402: Published Articles
```

---

# EVENT & PHYSICAL DATA (300 Series)

## 301: Beacon Dwell Data
**Storage:** SQL `beacon_events`, Vector `physical_behavior`  
**Filter Rules:**
- Include: user_id, artist_booth_id, dwell_time, timestamp, event_id
- Minimum dwell_time: 30 seconds (ignore walk-bys)

**Primary Purpose:** Physical interest detection and artist-customer matching

**Use Cases:**
- Interest intensity ("14 min at glass booth = strong interest")
- Artist similarity ("People who visit Artist A also visit Artist B")
- Event layout optimization for promoters
- Cross-channel behavior (physical + digital correlation)
- Product recommendation enhancement

**Related Classifications:**
- **Critical:** Combine with `131: Purchase History` (online + offline behavior)
- Combine with `101: Active Products` (booth dwell → product recommendations)
- Use for `141: User Preferences` enrichment

**Intelligence Example:**
```
User lingers 14min at glass artist booth
+ User hesitated on 2 glass product swipes (132: Browsing)
+ User previously bought ceramics (131: Purchases)
→ Intelligence: Strong preference for delicate craftsmanship
→ Recommend: Fine jewelry, detailed etchings, glass art
```

---

## 302: Event Performance Data
**Storage:** SQL `events`, `event_sales`, Vector `event_intelligence`  
**Filter Rules:**
- Include: artist_id, event_id, sales_amount, foot_traffic, weather_conditions

**Primary Purpose:** Artist-event matching and success prediction

**Use Cases:**
- Recommending events to artists ("You'd do well at X show")
- Recommending artists to promoters ("Invite Artist Y to your show")
- Success factor analysis ("Artists with outdoor booths sell 30% less in rain")
- ROI prediction for artists

**Related Classifications:**
- Combine with `202: Weather Data` for environmental factors
- Combine with `301: Beacon Data` for traffic patterns
- Combine with artist product data (101/102) for fit scoring

---

# ENVIRONMENTAL DATA (200 Series)

## 201: Weather Historical Data
**Storage:** SQL `weather_history`, Vector `weather_patterns`  
**Filter Rules:**
- Include: location, date, temp, precipitation, severe_weather

**Primary Purpose:** Event risk assessment and seasonal pattern detection

**Use Cases:**
- Product viability warnings ("Paper products + rain forecast = warn artist")
- Event success prediction ("4/5 years had rain at this event")
- Seasonal trend correlation ("Spring = landscape preference spike")
- Inventory timing guidance

**Related Classifications:**
- **Critical for:** `302: Event Performance` (weather affects sales)
- Combine with `102: Deleted Products` (rain years = paper deletions)

---

## 202: Economic Indicators
**Storage:** SQL `economic_data`, Vector `market_conditions`  
**Filter Rules:**
- Include: unemployment_rate, consumer_confidence, spending_trends, date

**Primary Purpose:** Pricing strategy and market timing

**Use Cases:**
- Dynamic pricing recommendations
- Event timing optimization ("Don't schedule during recession")
- Product positioning ("Luxury items harder to sell in down market")

---

# SYSTEM METADATA (900 Series)

## 901: Data Quality Metrics
**Storage:** SQL `data_quality_logs`, Redis `quality_scores`  
**Filter Rules:**
- Track completeness, accuracy, freshness for ALL other classifications

**Primary Purpose:** Ensuring Leo queries reliable data

**Use Cases:**
- Confidence scoring ("User profile based on 3 purchases = low confidence")
- Data freshness tracking ("Preference profile last updated 30 days ago = needs refresh")
- Missing data alerts ("50% of products missing style tags = blind spot")

---

# CROSS-CLASSIFICATION INTELLIGENCE EXAMPLES

## Example 1: Complete User Intelligence
```
Question: "What should we recommend to User 123?"

Step 1: Check 141 (User Preferences) → Load profile
Step 2: Check 131 (Purchase History) → Abstract art, blue colors
Step 3: Check 132 (Browsing History) → Ceramics, glass art recently
Step 4: Check 301 (Beacon Data) → Lingered at glass booths last event
Step 5: Query 101 (Active Products) → Filter by: blue, abstract, glass, ceramics
Step 6: Score results using 141 preferences
Step 7: Return top 20

Result: Highly personalized recommendations using 5 data classifications
```

## Example 2: Trend Death Detection
```
Question: "What trends are dying?"

Step 1: Check 102 (Deleted Products) last 90 days
Step 2: Cluster by style + color
Step 3: Find patterns with >10 deletions
Step 4: Check 101 (Active Products) → How many still making this?
Step 5: Check 151 (Search Queries) → Is demand dropping too?
Step 6: Store finding in truth database

Result: "Red square abstracts dying - 23 deletions, 5 artists still making, searches down 60%"
```

## Example 3: Content Gap Analysis
```
Question: "What content should we create?"

Step 1: Check 401 (Draft Articles) → Cluster topics (15 about "shipping")
Step 2: Check 151 (Search Queries) → Search volume ("shipping" = 500/month)
Step 3: Check 402 (Published Articles) → Existing content (only 2 articles)
Step 4: Check 501 (Support Cases) → Support burden (30 cases/month about shipping)

Result: "Create comprehensive shipping guide - high demand, low supply, support burden"
```

## Example 4: Artist-Event Matching
```
Question: "Which events should Artist X attend?"

Step 1: Get Artist X products from 101 → Watercolor landscapes, $200-400 range
Step 2: Check 302 (Event Performance) → Where do similar artists succeed?
Step 3: Check 201 (Weather History) → Avoid rainy events (watercolor = paper)
Step 4: Check 301 (Beacon Data) → Which events have customers who like landscapes?
Step 5: Score and rank events

Result: "Top 3 events with 85% fit score, rain risk analysis included"
```

---

# QUERY ROUTING RULES (For Leo AI)

When Leo receives a query, use this logic to determine which classifications to use:

**Customer Shopping Intent:**
- Primary: 101 (Active Products)
- Personalization: 141 (User Preferences)
- Enhancement: 131 (Purchase History), 132 (Browsing)

**Trend Analysis Intent:**
- Primary: 102 (Deleted Products)
- Context: 101 (Active Products), 151 (Search Queries)
- Environmental: 201 (Weather), 202 (Economic)

**Content Strategy Intent:**
- Primary: 401 (Draft Articles), 151 (Search Queries)
- Context: 402 (Published Articles), 501 (Support Cases)

**Artist Success Intent:**
- Primary: 302 (Event Performance)
- Context: 101 (Artist Products), 301 (Beacon Data), 201 (Weather)

**Support/Help Intent:**
- Primary: 402 (Published Articles)
- Learning: 501 (Support Cases)
- Escalation: Human handoff

---

# MAINTENANCE & UPDATES

**This document should be updated when:**
- New data sources are added to the platform
- New use cases are discovered
- Classification purposes change
- Query routing logic needs adjustment

**Last Updated:** January 23, 2025  
**Next Review:** After Phase 1 implementation

---

**This is a living document. As Leo learns new patterns and the platform grows, new classifications will be added and existing ones refined.**


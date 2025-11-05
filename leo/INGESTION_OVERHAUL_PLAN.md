# Leo AI - Phase 0 Implementation: Data Foundation
## Data Classification & Ingestion Overhaul

> **Status:** Planning Phase - DO NOT EXECUTE YET  
> **Phase:** Phase 0 (Weeks 1-2) - Must complete BEFORE Phase 1  
> **Goal:** Organize ALL data using Dewey Decimal classification system  
> **Impact:** Clean, organized data foundation for all future intelligence

---

## Current State Analysis

### What the Vacuum Script Does Now:
1. **Discovers all tables** - Automatically finds every table in database
2. **Basic collection routing** - Uses simple table name matching:
   - Table contains "product"/"art"/"item" → `art_metadata`
   - Table contains "user" + "interaction" → `user_interactions`
   - Table contains "event" → `event_data`
   - Table contains "feedback"/"learning" → `learning_feedback`
   - Everything else → `site_content`
3. **No status filtering** - Ingests ALL data from table (active, deleted, draft, everything mixed)
4. **Timestamp tracking** - Already detects updated_at/created_at columns for incremental updates
5. **Batch processing** - Processes 100 records at a time

### Problems with Current Approach:
- ❌ Active and deleted products mixed in same collection
- ❌ Draft articles mixed with published articles
- ❌ No way to query "only active products" vs "only deleted products"
- ❌ Classification catalog (DATA_CLASSIFICATION.md) not being used
- ❌ No metadata about WHY data was ingested or what it's FOR

---

## The New Approach

### Core Principle: Classification on Ingestion
Every record gets classified as it's ingested based on:
1. **Table name** (products, articles, orders, etc.)
2. **Status field** (active, deleted, draft, published, etc.)
3. **Data attributes** (deleted_at, status, type, etc.)

### Classification Flow:
```
SQL Record → Classification Logic → Tagged with code → Routed to correct vector collection

Example:
products table, status='active', deleted_at=NULL
  → Classification: 101
  → Vector Collection: 101_active_products
  → Purpose: Customer shopping

products table, deleted_at IS NOT NULL
  → Classification: 102
  → Vector Collection: 102_deleted_products
  → Purpose: Trend analysis
```

### Fallback for Unclassified Data:
```
If classification cannot be determined:
  → Classification: 999 (general_knowledge)
  → Vector Collection: 999_general_knowledge
  → Purpose: General intelligence until properly classified
  → Log warning: "Table X needs classification rules"
```

This ensures:
- Nothing breaks if we add new tables
- We get alerted about unclassified data
- Data still available for queries (just not optimally organized)

---

## Implementation Plan

### Phase 1: SQL Schema Updates (Preparation)

**Goal:** Ensure all tables have proper tracking columns

**Tasks:**
1. **Audit all tables for timestamp columns**
   ```sql
   SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
   AND (COLUMN_NAME LIKE '%updated_at%' OR COLUMN_NAME LIKE '%created_at%')
   ORDER BY TABLE_NAME;
   ```

2. **Add missing timestamp columns** (where needed)
   ```sql
   -- For tables missing updated_at
   ALTER TABLE {table_name} 
   ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
   
   -- For tables missing created_at
   ALTER TABLE {table_name}
   ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ```

3. **Benefits:**
   - Incremental updates work for all tables
   - Front-end logging system can use these later
   - Audit trail for data changes

**Decision Point:** Should we add `classification` column to tables?
- **Option A:** Yes - store classification in SQL
  - Pros: Fast queries, can JOIN on classification
  - Cons: Schema changes, data duplication
- **Option B:** No - compute classification on-the-fly
  - Pros: No schema changes, flexible classification logic
  - Cons: Recomputed every vacuum run
- **Recommendation:** Option B for now (computed), can add column later if needed

---

### Phase 2: Create Classification Rules Module

**Goal:** Centralized logic for determining classification

**New File:** `/leo/src/utils/classificationRules.js`

```javascript
/**
 * Classification Rules Engine
 * Determines Dewey Decimal-style classification for any database record
 */

class ClassificationRules {
  
  /**
   * Main classification function
   * @param {string} tableName - SQL table name
   * @param {object} record - Database record
   * @returns {object} { code: '101', collection: '101_active_products', purpose: '...', confidence: 1.0 }
   */
  static classify(tableName, record) {
    const tableLower = tableName.toLowerCase();
    
    // PRODUCTS (100 Series)
    if (tableLower === 'products') {
      return this.classifyProducts(record);
    }
    
    // ORDERS (130 Series - Purchase behavior)
    if (tableLower === 'orders' || tableLower === 'order_items') {
      return this.classifyOrders(record);
    }
    
    // ARTICLES/CONTENT (400 Series)
    if (tableLower === 'articles' || tableLower === 'posts' || tableLower === 'content') {
      return this.classifyArticles(record);
    }
    
    // EVENTS (300 Series)
    if (tableLower === 'events' || tableLower === 'festivals' || tableLower === 'shows') {
      return this.classifyEvents(record);
    }
    
    // USER BEHAVIOR (130 Series)
    if (tableLower === 'product_views' || tableLower === 'page_views') {
      return { code: '132', collection: '132_browsing_patterns', purpose: 'Browsing behavior analysis', confidence: 1.0 };
    }
    
    if (tableLower === 'cart_items' || tableLower === 'wishlist') {
      return { code: '133', collection: '133_cart_wishlist', purpose: 'Intent detection', confidence: 1.0 };
    }
    
    // SUPPORT (500 Series)
    if (tableLower === 'support_cases' || tableLower === 'tickets') {
      return this.classifySupportCases(record);
    }
    
    // FALLBACK: Unclassified
    return {
      code: '999',
      collection: '999_general_knowledge',
      purpose: 'Unclassified - needs classification rules',
      confidence: 0.1,
      warning: `Table '${tableName}' not classified - add rules to classificationRules.js`
    };
  }
  
  /**
   * Classify products based on status and deletion state
   */
  static classifyProducts(record) {
    // Deleted products (regardless of status)
    if (record.deleted_at !== null && record.deleted_at !== undefined) {
      return {
        code: '102',
        collection: '102_deleted_products',
        purpose: 'Trend death detection, market analysis',
        confidence: 1.0
      };
    }
    
    // Draft/pending products
    if (record.status === 'draft' || record.status === 'pending') {
      return {
        code: '103',
        collection: '103_draft_products',
        purpose: 'Inventory prediction, artist engagement',
        confidence: 1.0
      };
    }
    
    // Active products (default)
    if (record.status === 'active') {
      return {
        code: '101',
        collection: '101_active_products',
        purpose: 'Customer shopping, recommendations, search',
        confidence: 1.0
      };
    }
    
    // Unknown status
    return {
      code: '999',
      collection: '999_general_knowledge',
      purpose: 'Product with unknown status',
      confidence: 0.5,
      warning: `Product ID ${record.id} has unexpected status: ${record.status}`
    };
  }
  
  /**
   * Classify orders based on completion status
   */
  static classifyOrders(record) {
    if (record.status === 'completed' || record.completed_at) {
      return {
        code: '131',
        collection: '131_purchase_history',
        purpose: 'User preference learning, recommendations',
        confidence: 1.0
      };
    }
    
    if (record.status === 'cancelled') {
      return {
        code: '131.9',
        collection: '131_9_cancelled_orders',
        purpose: 'Cancellation analysis, failure patterns',
        confidence: 1.0
      };
    }
    
    // Pending orders
    return {
      code: '133',
      collection: '133_cart_wishlist',
      purpose: 'Intent detection, conversion optimization',
      confidence: 0.8
    };
  }
  
  /**
   * Classify articles/content
   */
  static classifyArticles(record) {
    if (record.status === 'published' && !record.deleted_at) {
      return {
        code: '402',
        collection: '402_published_content',
        purpose: 'Chatbot knowledge, help center, SEO',
        confidence: 1.0
      };
    }
    
    if (record.status === 'draft') {
      return {
        code: '401',
        collection: '401_draft_articles',
        purpose: 'Content strategy, author engagement',
        confidence: 1.0
      };
    }
    
    return {
      code: '999',
      collection: '999_general_knowledge',
      purpose: 'Article with unknown status',
      confidence: 0.5
    };
  }
  
  /**
   * Classify events
   */
  static classifyEvents(record) {
    // All events go to same collection for now
    // Can add sub-classifications later (past vs future, etc.)
    return {
      code: '302',
      collection: '302_event_performance',
      purpose: 'Artist-event matching, success prediction',
      confidence: 1.0
    };
  }
  
  /**
   * Classify support cases
   */
  static classifySupportCases(record) {
    if (record.status === 'resolved' || record.status === 'closed') {
      return {
        code: '501',
        collection: '501_support_knowledge',
        purpose: 'Chatbot training, pattern detection',
        confidence: 1.0
      };
    }
    
    // Open cases - maybe don't ingest yet?
    return {
      code: '999',
      collection: '999_general_knowledge',
      purpose: 'Open support case (not yet resolved)',
      confidence: 0.3
    };
  }
}

module.exports = ClassificationRules;
```

**Why a separate module?**
- Easy to update classification rules without touching vacuum script
- Testable in isolation
- Can be used by other parts of the system
- Clear documentation of classification logic

---

### Phase 3: Update Vacuum Script

**Goal:** Integrate classification system into vacuum-ingestion.js

**Changes to vacuum-ingestion.js:**

**1. Add classification import (top of file):**
```javascript
const ClassificationRules = require('./src/utils/classificationRules');
```

**2. Replace `determineCollection()` method (line 229):**
```javascript
determineCollection(tableName, sampleRow) {
  // Use classification rules engine
  const classification = ClassificationRules.classify(tableName, sampleRow);
  
  // Log warnings for low-confidence classifications
  if (classification.confidence < 0.9) {
    logger.warn(`Low confidence classification for ${tableName}:`, classification);
  }
  
  // Log unclassified data
  if (classification.code === '999') {
    logger.warn(`⚠️ UNCLASSIFIED DATA: ${tableName} needs classification rules`);
  }
  
  return classification.collection;
}
```

**3. Enhance document metadata (line 200-209):**
```javascript
const documents = batch.map((row, index) => {
  const classification = ClassificationRules.classify(tableName, row);
  
  return {
    id: `${tableName}_${row.id || i + index}`,
    content: this.formatRowContent(tableName, row),
    metadata: this.sanitizeMetadata({
      source_table: tableName,
      classification_code: classification.code,
      classification_purpose: classification.purpose,
      classification_confidence: classification.confidence,
      ingestion_timestamp: new Date().toISOString(),
      ...row,
      original_id: row.id || (i + index)
    }),
    source: 'intelligent_vacuum'
  };
});
```

**4. Add classification summary to completion log:**
```javascript
// At end of runIntelligentVacuum() (line 338)
const classificationSummary = {};
Object.keys(tableResults).forEach(table => {
  // Group by classification code
  // Log how many records went to each classification
});

logger.info(`✅ Classification Summary:`, classificationSummary);
logger.info(`⚠️ Unclassified records in 999_general_knowledge: ${classificationSummary['999'] || 0}`);
```

---

### Phase 4: Testing Strategy

**Goal:** Validate classification logic before full rebuild

**Test Steps:**

**1. Dry Run Mode (add to vacuum script):**
```javascript
async runClassificationAudit() {
  // Don't actually ingest - just report what WOULD happen
  const tables = await this.getTableList();
  const audit = {};
  
  for (const table of tables) {
    const [rows] = await this.dbConnection.execute(`SELECT * FROM ${table} LIMIT 10`);
    
    const classifications = rows.map(row => ClassificationRules.classify(table, row));
    
    audit[table] = {
      row_count: rows.length,
      classifications: classifications.reduce((acc, c) => {
        acc[c.code] = (acc[c.code] || 0) + 1;
        return acc;
      }, {}),
      warnings: classifications.filter(c => c.warning).map(c => c.warning)
    };
  }
  
  return audit;
}
```

**Run:** `node vacuum-ingestion.js --audit`

**2. Sample table test:**
```bash
# Test just products table
node vacuum-ingestion.js --table=products --limit=100 --dry-run
```

**3. Review output:**
- How many records classified to each code?
- Any unexpected classifications?
- Any warnings about unclassified data?

---

### Phase 5: Vector Database Wipe & Rebuild

**Goal:** Clean slate with properly organized data

**Steps:**

**1. Backup current vector database (optional):**
```bash
# If we want to preserve anything
cp -r leo/data/chroma_db leo/data/chroma_db_backup_$(date +%Y%m%d)
```

**2. Wipe vector collections:**
```bash
# Add to vacuum script as CLI option
node vacuum-ingestion.js --wipe-vectors --confirm
```

Or manually:
```javascript
// In vectorDatabase.js, add method:
async wipeAllCollections() {
  const collections = await this.client.listCollections();
  for (const col of collections) {
    await this.client.deleteCollection({ name: col.name });
    logger.info(`Deleted collection: ${col.name}`);
  }
}
```

**3. Full rebuild with classification:**
```bash
# Reset last run timestamp to force full ingest
rm leo/data/last-vacuum-run.json

# Run vacuum with new classification system
node vacuum-ingestion.js
```

**4. Verify results:**
```bash
# Check what collections were created
curl http://localhost:8000/api/v1/collections

# Check sample data from each classification
curl http://localhost:8000/api/v1/collections/101_active_products/query \
  -d '{"query_texts": ["art"], "n_results": 3}'
```

---

### Phase 6: Monitoring & Validation

**Goal:** Ensure classification system works correctly

**Add to vacuum script:**

**1. Classification metrics logging:**
```javascript
const metrics = {
  total_records: totalProcessed,
  by_classification: {
    '101': countActiveProducts,
    '102': countDeletedProducts,
    '999': countUnclassified,
    // ... etc
  },
  unclassified_tables: tablesWithUnclassifiedData,
  low_confidence_records: recordsWithConfidenceBelow90,
  warnings: allWarnings
};

logger.info('📊 Classification Metrics:', JSON.stringify(metrics, null, 2));

// Alert if too much unclassified data
if (metrics.by_classification['999'] > totalProcessed * 0.1) {
  logger.error('⚠️⚠️⚠️ More than 10% of data is unclassified! Review classification rules.');
}
```

**2. Collection health check:**
```javascript
async validateCollections() {
  const collections = await this.vectorDB.listCollections();
  
  for (const collection of collections) {
    const count = await this.vectorDB.getCollectionCount(collection);
    logger.info(`Collection ${collection}: ${count} records`);
    
    // Validate collection naming matches classification codes
    if (!collection.match(/^\d{3}/) && collection !== '999_general_knowledge') {
      logger.warn(`Collection ${collection} doesn't follow classification naming convention`);
    }
  }
}
```

---

## Phase 0 Rollout (2 Weeks)

**This aligns with ARCHITECTURE.md Phase 0 timeline**

### Week 1 (Days 1-7): Preparation & Classification Logic
**Days 1-2: SQL Schema**
- [ ] Audit all SQL tables for timestamp columns
- [ ] Add missing updated_at/created_at columns
- [ ] Test timestamp column detection

**Days 3-4: Classification Engine**
- [ ] Create `/leo/src/utils/classificationRules.js` module
- [ ] Write classification logic for major tables (products, orders, articles, events)
- [ ] Test classification logic with sample data

**Days 5-7: Vacuum Integration**
- [ ] Update vacuum-ingestion.js to import and use classificationRules
- [ ] Modify determineCollection() to use classification
- [ ] Add classification metadata to documents
- [ ] Add logging for unclassified data warnings

### Week 2 (Days 8-14): Rebuild & Validate
**Days 8-10: Vector Database Rebuild**
- [ ] Backup existing vector DB (optional)
- [ ] Wipe all existing collections
- [ ] Reset vacuum timestamp
- [ ] Run full vacuum rebuild with classification
- [ ] Verify collections created with correct names

**Days 11-14: Validation & Documentation**
- [ ] Validate record counts per classification
- [ ] Spot-check data in each collection
- [ ] Verify < 5% data in 999_general_knowledge
- [ ] Test basic queries against new structure
- [ ] Document any edge cases for future reference

**Phase 0 Complete:** Data is organized, Phase 1 can begin

---

## Success Criteria

**Before declaring complete:**

✅ All major tables have classification rules (not in 999)  
✅ Less than 5% of data in 999_general_knowledge  
✅ Vector collections named by classification codes  
✅ Classification metadata included in all documents  
✅ Warnings logged for any unclassified data  
✅ Vacuum script runs successfully end-to-end  
✅ Query tests pass against new collection structure  
✅ Documentation updated in ARCHITECTURE.md  

---

## Risk Management

**Risk 1: Breaking existing queries**
- **Mitigation:** Keep old collections temporarily, gradually migrate queries
- **Fallback:** Can run both old and new vacuum scripts in parallel during transition

**Risk 2: Classification logic bugs**
- **Mitigation:** Dry-run testing before actual ingestion
- **Fallback:** Fix rules, wipe and rebuild (data is in SQL, can always re-ingest)

**Risk 3: Too much unclassified data**
- **Mitigation:** Start with major tables, gradually add rules for minor tables
- **Fallback:** Unclassified data still usable in 999, can reclassify later

**Risk 4: SQL schema changes causing issues**
- **Mitigation:** Test on copy of database first
- **Fallback:** Timestamp columns are additive, can be removed if needed

---

## Decisions Made

1. **SQL Schema Changes:** Add updated_at/created_at to ALL tables that don't have them
2. **Classification Priorities:** Classify ALL major tables upfront (products, orders, articles, events, support)
3. **Vector Database:** Wipe and rebuild (it's test data, SQL is source of truth)
4. **Testing:** Test directly with vacuum script, use logging to validate
5. **Timeline:** 2 weeks (Phase 0), must complete before Phase 1

---

**Status:** Planning complete, ready to begin execution

**Next Step:** Begin Phase 0, Week 1, Day 1 - SQL Schema Audit


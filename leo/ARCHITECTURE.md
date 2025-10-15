# Leo AI Platform - Architecture Documentation

## Overview
Leo AI is an intelligent art marketplace platform that uses AI to provide personalized search, recommendations, and user experiences. The system is built around a **Central Brain** architecture where Llama 3.2 makes intelligent decisions about how to handle user queries.

## Core Philosophy
**"Let AI decide how to handle AI tasks"** - Instead of hardcoded endpoints and logic, Llama analyzes each request and determines the best approach dynamically.

---

## System Architecture

### High-Level Flow
```
User Query → Component → Central Brain → Llama Analysis → Vector Search → Truth Application → Llama Organization → Component → SQL APIs → User Display
```

### Detailed Flow
1. **User Interaction**: User performs action (search, browse homepage, etc.)
2. **Component Processing**: Frontend component cleans query and adds context
3. **Central Brain**: Single intelligent coordinator receives query + context
4. **Llama Analysis**: AI determines intent, data sources, and execution plan
5. **Data Gathering**: Brain executes plan by querying vectors and truths
6. **Llama Organization**: AI organizes results and extracts clean IDs
7. **Component Response**: Frontend receives organized lists of IDs
8. **SQL Data Fetching**: Component uses IDs to get real data (names, prices, images)
9. **User Display**: Clean, intelligent results shown to user

---

## Core Components

### 1. Data Ingestion
**File**: `vacuum-ingestion.js`
- **Purpose**: Automatically discovers and ingests ALL database tables into vector storage
- **Operation**: Runs independently, processes new data since last run
- **Intelligence**: Determines appropriate vector collections based on table content
- **Scheduling**: Can be run manually or scheduled

### 2. Central Brain
**File**: `leo/src/core/centralBrain.js`
- **Purpose**: Single intelligent coordinator for all user queries
- **Key Method**: `processQuery(query, context)`
- **Intelligence**: Uses Llama 3.2 to analyze, plan, and organize responses
- **Output**: Clean lists of IDs organized by category (products, articles, events, users)

### 3. Vector Databases
**Main DB**: `leo/src/core/vectorDatabase.js` (Port 8000)
- Collections: `art_metadata`, `site_content`, `user_interactions`, `event_data`, `learning_feedback`

**Truth DB**: `leo/src/core/truthVectorDatabase.js` (Port 8001)
- Collections: `user_truths`, `behavioral_truths`, `content_truths`, `pattern_truths`, `temporal_truths`

### 4. Truth Extraction & Learning
**Files**: `truthExtractor.js`, `continuousTruthDiscovery.js`
- **Purpose**: Continuously analyze data to discover behavioral patterns
- **Operation**: Multi-layer system (primary crawl, validation, meta-truth discovery)
- **Intelligence**: Uses Llama to extract actionable insights from user behavior

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

*This architecture enables Leo AI to become increasingly intelligent over time, learning user patterns and improving recommendations without requiring constant code changes.*

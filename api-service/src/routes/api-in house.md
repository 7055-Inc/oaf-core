# API Standardization & Cleanup Guide (Internal)

## Overview
This document serves as a developer reference guide for the API standardization work completed during the route consolidation project. It outlines the major issues identified, fixes applied, and standards established for future development.

## Phase 1: Critical Infrastructure Fixes

### Database Path Standardization
**Issue:** 9 route files were using incorrect database import paths
- **Wrong:** `require('../db')` 
- **Correct:** `require('../../config/db')`

**Files Fixed:**
- admin.js, articles.js, tags.js, applications.js, carts.js
- custom-events.js, terms.js, api-keys.js, series.js

**Mystery:** These files were somehow working before despite incorrect paths - root cause never determined.

### JWT Authentication Cleanup
**Issue:** Inconsistent JWT implementation across routes with ~500-700 lines of duplicate code

**Problems Found:**
1. **Unused Functions:** Many routes had `verifyToken` functions that were never called
2. **Direct jwt.verify() Calls:** Routes implementing their own JWT verification instead of using middleware
3. **Inconsistent Property Access:** Mix of `req.user.*` and `req.*` for user data
4. **Duplicate Imports:** Redundant jwt imports in files already using middleware

**Standardization Applied:**
- Removed unused `verifyToken` functions from 6 files
- Standardized to use centralized `verifyToken` middleware
- Consistent property access pattern: `req.userId`, `req.user.role`
- Cleaned up duplicate imports

**Files Cleaned:**
- admin.js, articles.js, applications.js, carts.js, custom-events.js, terms.js

### CSRF Protection Clarification
**Initial Misunderstanding:** Thought CSRF protection was missing everywhere
**Reality:** CSRF is properly implemented at application level in `server.js`
- Uses `csurf` middleware with cookie-based tokens
- Applied to all routes automatically
- No additional route-level CSRF needed

### Database Schema Alignment Issues
**Issue:** Route consolidation revealed database table mismatches
- **Problem:** Tags routes were using incorrect table names
- **Wrong:** `tags` table (doesn't exist)
- **Correct:** `article_tags` and `article_tag_relations` tables
- **Impact:** Caused 500 errors preventing route consolidation completion

**Database Schema Fixes Applied:**
- Fixed all table references: `tags` → `article_tags`
- Fixed relationship queries: `article_tags.tag_id` → `article_tag_relations.tag_id`
- Fixed column names: `tag_name` → `name` 
- Removed references to non-existent `description` column
- Added proper JOIN syntax for relationship tables

**Files Affected:**
- articles.js (all tags-related queries corrected)

## Phase 2: Route-Specific Fixes

### Articles Route Bug Fix
**Issue:** Database field mismatch causing query failures
- **Wrong:** `author` field reference
- **Correct:** `author_id` field reference
- **Method:** Changed from `db.execute` to `db.query` for consistency

## Phase 3: Route Consolidation Implementation

### Content Management System Unification
**Strategy:** Consolidated all content-related routes into `articles.js`
- **Rationale:** Tags, series, topics, and articles all work together as content management
- **Permission System:** All use `manage_articles_topics` permission
- **Database Tables:** All use `articles`, `article_*` table family

**Consolidations Completed:**
1. **tags.js → articles.js** (5 endpoints as `/tags/*`)
2. **series.js → articles.js** (2 endpoints as `/series/*`)
3. **topics.js → articles.js** (6 endpoints as `/topics/*`)

### Event Management System Unification
**Strategy:** Consolidated all event-related routes into `events.js`
- **Rationale:** Event types and custom events are part of the events ecosystem
- **Permission System:** All use event management permissions
- **Database Tables:** All use `events`, `event_*` table family

**Consolidations Completed:**
1. **custom-events.js → events.js** (4 endpoints as `/custom/*`)
2. **event-types.js → events.js** (1 endpoint as `/types`)

### Product Management System Unification
**Strategy:** Consolidated all product-related routes into `products.js`
- **Rationale:** Variations are part of the product management ecosystem
- **Permission System:** All use product management permissions
- **Database Tables:** All use `products`, `product_*` table family

**Consolidations Completed:**
1. **variations.js → products.js** (6 endpoints as `/products/variations/*`)

### Route Consolidation Methodology
**Process Established:**
1. **CONSOLIDATE** - Merge routes physically
2. **SEARCH** - Find all frontend usage with grep
3. **FIX** - Update frontend API calls
4. **TEST** - Verify endpoints work correctly

**Priority System:**
- 🟢 SAFEST: Simple routes with minimal dependencies
- 🟡 SAFE: Related routes with clear consolidation path
- 🟠 MODERATE: Complex routes requiring careful testing
- 🔴 RISKY: Critical routes with extensive dependencies

### Route Ordering Rules
**Critical Rule:** Specific routes MUST come before general routes in Express
- **Example:** `/my-events` must come before `/:id`
- **Reason:** Express matches the first pattern it encounters
- **Fix Applied:** Reordered routes in events.js to prevent ID parameter conflicts

## Phase 3: Critical Mistakes and Corrections

### ❌ API Keys Consolidation Attempt (CANCELLED)
**What Happened:** Attempted to consolidate `api-keys.js` into `users.js` 
**Why This Was Wrong:** 
- API keys ARE the authentication mechanism for 3rd party access
- They're not user management functionality - they're authentication infrastructure
- API keys don't require authentication to get - they ARE the authentication

**Actions Taken:**
1. **Immediate Restoration:** Recreated `api-keys.js` file exactly as it was
2. **Server Routing:** Restored `app.use('/api-keys', apiKeyLimiter, require('./routes/api-keys'))`
3. **Frontend Fixes:** Reverted all API calls back to original paths
4. **Service Restart:** Restarted API service to apply changes
5. **Documentation:** Updated all docs to reflect this critical correction

**Files Restored:**
- ✅ `api-service/src/routes/api-keys.js` - Recreated with original functionality
- ✅ `api-service/src/server.js` - Restored original route mounting
- ✅ `pages/api-keys.js` - Reverted to original API endpoints

**Critical Lesson:** Authentication infrastructure must remain separate from user management. API keys are the foundation of the entire system's 3rd party access layer.

## Development Standards Going Forward

### Database Connection
```javascript
// ALWAYS use this path
const db = require('../../config/db');
```

### JWT Middleware Usage
```javascript
// Use centralized middleware
const { verifyToken } = require('../middleware/authMiddleware');

// Apply to protected routes
router.get('/protected', verifyToken, async (req, res) => {
  // Access user data consistently
  const userId = req.userId;
  const userRole = req.user.role;
});
```

### Route Organization
1. **Specific routes first** (exact matches)
2. **General routes second** (parameter matches)
3. **Comments** for complex route ordering

```javascript
// Specific route
router.get('/my-events', verifyToken, handler);

// General route (MUST come after specific routes)
router.get('/:id', handler);
```

### Authentication Infrastructure Rules
**NEVER consolidate authentication infrastructure:**
- API keys (`api-keys.js`) - 3rd party authentication layer
- Core auth routes (`auth.js`) - User authentication
- JWT middleware - Token verification
- CSRF protection - Security layer

These are foundational systems that should remain separate and focused.

### Error Handling
**Consistent Format:**
```javascript
res.status(500).json({ 
  error: 'Brief description',
  details: err.message 
});
```

## Testing Standards

### URL Structure
- **Production:** `https://api2.onlineartfestival.com/api/[route]`
- **NEVER test on localhost during production fixes**

### Basic Endpoint Testing
```bash
# Test authentication
curl -s "https://api2.onlineartfestival.com/api/events/my-events" \
  -H "Content-Type: application/json"
# Should return: {"error":"No token provided"}

# Test general endpoint
curl -s "https://api2.onlineartfestival.com/api/events" \
  -H "Content-Type: application/json"
```

### API Keys Testing (CRITICAL)
```bash
# Test API keys endpoint exists
curl -s "https://api2.onlineartfestival.com/api-keys" \
  -H "Content-Type: application/json"
# Should return: {"error":"No token provided"} or similar auth error

# Test with fake JWT (should fail gracefully)
curl -s "https://api2.onlineartfestival.com/api-keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token"
# Should return: {"error":"Invalid token"} or similar
```

## Files Modified During Cleanup

### Database Path Fixes (9 files)
- admin.js, articles.js, tags.js, applications.js, carts.js
- custom-events.js, terms.js, api-keys.js, series.js

### JWT Cleanup (6 files)
- admin.js, articles.js, applications.js, carts.js, custom-events.js, terms.js

### Route Consolidation (1 successful)
- **Merged:** custom-events.js → events.js
- **Updated:** pages/dashboard/index.js (2 API calls)
- **Deleted:** custom-events.js
- **Modified:** server.js (route mounting)

### API Keys Restoration (CRITICAL)
- **Recreated:** api-keys.js with original functionality
- **Restored:** server.js route mounting
- **Reverted:** pages/api-keys.js to original endpoints

## Route Consolidation Progress

### Completed ✅
- custom-events.js → events.js (4 endpoints merged)
- event-types.js → events.js (1 endpoint merged)  
- tags.js → articles.js (5 endpoints merged)
- series.js → articles.js (2 endpoints merged)
- topics.js → articles.js (6 endpoints merged)
- variations.js → products.js (6 endpoints merged)

### Cancelled ❌
- **api-keys.js → users.js** - CANCELLED (Authentication infrastructure must remain separate)
- **admin-financial.js → admin.js** - CANCELLED (Still in development/planning phase)

### Next Targets
1. **🟡 SAFE:** terms.js → admin.js
2. **🟡 SAFE:** announcements.js → admin.js
3. **🟡 SAFE:** domains.js → sites.js (both handle website management)

### Core Business Systems (Never Consolidate)
- **products.js** - E-commerce core (catalog, variations, inventory)
- **users.js** - User management core (profiles, authentication, permissions)  
- **events.js** - Event management core (listings, types, custom events)
- **applications.js** - Application workflow core (connects users+events+billing+calendar)
- **carts.js** - Shopping cart core (complex cart logic, session management)
- **checkout.js** - Payment processing core (Stripe integration, order management)

**Reasoning**: These systems serve as integration hubs with complex workflows, multi-role permissions, and sophisticated business logic.

### Files Reduced
- **Before:** 27 route files
- **After:** 21 route files (6 consolidations successful)
- **Target:** ~18-20 route files (significant progress made)

## Lessons Learned

1. **Database Paths:** Always verify import paths are correct
2. **JWT Middleware:** Use centralized middleware instead of route-level implementation
3. **Route Ordering:** Critical for Express routing to work correctly
4. **Testing:** Always test on production URL structure
5. **Documentation:** Keep docs updated in parallel with changes
6. **🚨 CRITICAL:** Authentication infrastructure must remain separate from user management
7. **🚨 CRITICAL:** API keys are the foundation - never consolidate authentication layers
8. **🚨 CRITICAL:** Always understand the PURPOSE of a route before consolidating it
9. **Database Schema:** Verify table names and column names exist before consolidation
10. **Relationship Tables:** Use proper JOIN syntax with `*_relations` tables, not direct foreign keys
11. **Frontend Impact:** Always update frontend API calls immediately after route consolidation
12. **Testing Strategy:** Test both old (404) and new (200) endpoints after consolidation
13. **Development Status:** Don't consolidate routes still in development/planning phase

## Emergency Procedures

### If Routes Stop Working
1. Check database paths (`../../config/db`)
2. Verify JWT middleware is imported correctly
3. Check route ordering (specific before general)
4. Test with production URL structure

### If API Keys Stop Working (CRITICAL)
1. **Immediate Priority:** API keys are the foundation of the entire system
2. Check `api-keys.js` exists and is properly structured
3. Verify server.js mounting: `app.use('/api-keys', apiKeyLimiter, require('./routes/api-keys'))`
4. Test endpoint responds: `curl -s "https://api2.onlineartfestival.com/api-keys"`
5. Check database connection and JWT middleware imports
6. Restart API service if needed: `pm2 restart api-service`

### If Consolidation Fails
1. Restore from backup
2. Check frontend API calls were updated
3. Verify server.js route mounting
4. Test individual endpoints separately

---

*This document should be updated as additional standardization work is completed.*
*Last updated: January 2024 - Added API Keys restoration documentation*

# articles.js - Internal Documentation

## Overview
Comprehensive content management system for the Beemeeart platform. Handles articles, tags, topics, series, and access control with advanced permissions. Supports hierarchical topics, article series, SEO optimization, social media integration, and fine-grained access control. This system provides a complete editorial workflow with role-based permissions and content organization features.

## Architecture
- **Type:** Route Layer (API Endpoints) - Content Management System
- **Dependencies:** express, database connection, JWT middleware, multer (file uploads), path, fs
- **Database Tables:**
  - `articles` - Main article content and metadata
  - `article_analytics` - View counts, reading time, engagement metrics
  - `article_seo` - SEO metadata (meta titles, descriptions, keywords)
  - `article_social` - Social media metadata (Open Graph, Twitter cards)
  - `article_tags` - Tag definitions and slugs
  - `article_tag_relations` - Article-tag relationships
  - `article_topics` - Hierarchical topic structure
  - `article_topic_relations` - Article-topic relationships
  - `article_series` - Article series definitions
  - `article_series_relations` - Article-series relationships with ordering
  - `article_connections` - Related content connections
  - `article_restrictions` - Access control restrictions
  - `topic_restrictions` - Topic-level access restrictions
  - `user_permissions` - User content management permissions
  - `users` - User accounts
  - `user_profiles` - User profile information
- **External Services:** File storage system, image processing

## Content Management Architecture

### Article Lifecycle
1. **Creation:** Draft articles created with comprehensive metadata
2. **Editing:** Authors and content managers can edit articles
3. **Publishing:** Content managers can publish articles
4. **Analytics:** View tracking and engagement metrics
5. **Organization:** Topics, tags, and series for content structure
6. **Access Control:** Fine-grained permissions and restrictions

### Permission System
```
Admin → Full access to all content management features
Content Manager → Can manage all articles, topics, tags, series
Author → Can create and edit own articles (publish requires content manager)
User → Read access based on article/topic restrictions
Anonymous → Public articles only
```

### Content Organization Hierarchy
```
Topics (Hierarchical)
├── Parent Topics
│   ├── Child Topics
│   └── Articles
├── Series (Ordered Collections)
│   ├── Article 1 (Position 1)
│   ├── Article 2 (Position 2)
│   └── Article N (Position N)
└── Tags (Flat Labels)
    └── Tagged Articles
```

## Article Management

### GET /api/articles
**Purpose:** List articles with pagination and access control

**Authentication:** Optional - JWT token for role-based filtering

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of articles per page

**Access Control:**
- **Anonymous/Users:** Only published articles
- **Admins:** All articles regardless of status

**Database Query:**
```sql
SELECT a.id, a.title, a.content, a.excerpt, a.author_id, a.published_at, 
       a.status, a.slug, a.page_type, a.featured_image_id, a.created_at, a.updated_at,
       u.username as author_username
FROM articles a
LEFT JOIN users u ON a.author_id = u.id
WHERE a.status = 'published' -- (for non-admin users)
ORDER BY a.published_at DESC
LIMIT ? OFFSET ?
```

**Response Structure:**
```json
{
  "articles": [
    {
      "id": 123,
      "title": "Article Title",
      "content": "Full article content...",
      "excerpt": "Brief summary...",
      "author_id": 456,
      "published_at": "2024-01-15T10:30:00Z",
      "status": "published",
      "slug": "article-title",
      "author_username": "author123"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 95,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST /api/articles
**Purpose:** Create new article with comprehensive metadata

**Authentication:** Required - JWT token + content management permissions

**Request Body Structure:**
```json
{
  "title": "Article Title",
  "content": "Full article content...",
  "excerpt": "Brief summary...",
  "status": "draft",
  "topics": [1, 2, 3],
  "tags": [4, 5, 6],
  "series_id": 7,
  "position_in_series": 1,
  "connections": [
    {"type": "related_product", "id": 123},
    {"type": "related_event", "id": 456}
  ],
  "seo": {
    "meta_title": "SEO Title",
    "meta_description": "SEO Description",
    "meta_keywords": "keyword1, keyword2",
    "focus_keyword": "main keyword"
  },
  "social": {
    "og_title": "Social Media Title",
    "og_description": "Social Media Description",
    "twitter_card_type": "summary_large_image"
  }
}
```

**Processing Flow:**
1. **Validation:** Check required fields (title, content)
2. **Slug Generation:** Create unique URL-friendly slug
3. **Reading Time:** Calculate estimated reading time
4. **Article Creation:** Insert main article record
5. **Analytics Setup:** Create analytics tracking record
6. **Metadata Addition:** Add SEO and social media data
7. **Relationships:** Link topics, tags, series, connections

**Slug Generation Algorithm:**
```javascript
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};
```

**Reading Time Calculation:**
```javascript
const calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};
```

### PUT /api/articles/:id
**Purpose:** Update existing article with comprehensive permission checking

**Authentication:** Required - JWT token

**Permission Logic:**
- **Authors:** Can edit their own articles
- **Content Managers:** Can edit any article
- **Publishing:** Requires content management permissions

**Update Process:**
1. **Permission Check:** Validate user can edit article
2. **Selective Updates:** Only update provided fields
3. **Reading Time:** Recalculate if content changed
4. **Status Changes:** Handle publishing workflow
5. **Relationships:** Update topics, tags, series, connections
6. **Metadata:** Update SEO and social data

### DELETE /api/articles/:id
**Purpose:** Delete article with permission validation

**Authentication:** Required - JWT token

**Permission Logic:**
- **Authors:** Can delete their own articles
- **Admins:** Can delete any article

**Cascade Deletion:** Database handles related records automatically

### GET /api/articles/:slug
**Purpose:** Get single article with comprehensive metadata and access control

**Access Control:** Uses `checkArticleAccess` function for fine-grained permissions

**Response Includes:**
- Complete article data
- Author information
- SEO and social metadata
- Analytics data (view count, reading time)
- Associated topics and tags
- Series navigation (prev/next articles)
- Related connections
- **Auto View Tracking:** Updates view count on access

**Series Navigation Structure:**
```json
{
  "series": {
    "id": 7,
    "series_name": "Getting Started Guide",
    "slug": "getting-started-guide",
    "position_in_series": 2,
    "total_articles": 5,
    "prev_article": {
      "id": 122,
      "title": "Introduction",
      "slug": "introduction"
    },
    "next_article": {
      "id": 124,
      "title": "Advanced Topics",
      "slug": "advanced-topics"
    }
  }
}
```

### POST /api/articles/:id/view
**Purpose:** Update view count for article analytics

**Authentication:** None required (public endpoint)

**Analytics Update:**
```sql
INSERT INTO article_analytics (article_id, view_count, last_viewed)
VALUES (?, 1, NOW())
ON DUPLICATE KEY UPDATE 
  view_count = view_count + 1,
  last_viewed = NOW()
```

## Tag Management

### GET /api/articles/tags
**Purpose:** List all article tags with article counts

**Database Query:**
```sql
SELECT t.id, t.name, t.slug, t.created_at, 
       COUNT(DISTINCT atr.article_id) as article_count
FROM article_tags t
LEFT JOIN article_tag_relations atr ON t.id = atr.tag_id
LEFT JOIN articles a ON atr.article_id = a.id AND a.status = 'published'
GROUP BY t.id, t.name, t.slug, t.created_at
ORDER BY t.name ASC
```

### GET /api/articles/tags/:slug
**Purpose:** Get single tag with associated articles

**Query Parameters:**
- `page` (number, default: 1): Page number for article pagination
- `limit` (number, default: 10): Number of articles per page

**Response Structure:**
```json
{
  "tag": {
    "id": 4,
    "name": "Technology",
    "slug": "technology",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "articles": [
    {
      "id": 123,
      "title": "Tech Article",
      "slug": "tech-article",
      "excerpt": "About technology...",
      "author_username": "author123",
      "author_display_name": "John Author",
      "published_at": "2024-01-15T10:30:00Z",
      "view_count": 1250,
      "reading_time_minutes": 5
    }
  ]
}
```

### POST /api/articles/tags
**Purpose:** Create new article tag

**Authentication:** Required - JWT token + content management permissions

**Slug Generation:** Automatic from tag name

**Duplicate Prevention:** Checks for existing slugs

### PUT /api/articles/tags/:id
**Purpose:** Update existing article tag

**Authentication:** Required - JWT token + content management permissions

**Slug Regeneration:** Updates slug if name changes

### DELETE /api/articles/tags/:id
**Purpose:** Delete article tag and all relationships

**Authentication:** Required - JWT token + content management permissions

**Cleanup Process:**
1. Delete tag-article relationships
2. Delete the tag record

## Series Management

### GET /api/articles/series
**Purpose:** List all article series with pagination

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of series per page

**Database Query:**
```sql
SELECT s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at,
       COUNT(asr.article_id) as article_count
FROM article_series s
LEFT JOIN article_series_relations asr ON s.id = asr.series_id
LEFT JOIN articles a ON asr.article_id = a.id AND a.status = 'published'
GROUP BY s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at
ORDER BY s.created_at DESC
```

### GET /api/articles/series/:slug
**Purpose:** Get single series with all articles in order

**Access Control:** Applies `checkArticleAccess` to filter accessible articles

**Article Ordering:** Uses `position_in_series` for proper sequencing

**Response Structure:**
```json
{
  "series": {
    "id": 7,
    "series_name": "Getting Started Guide",
    "slug": "getting-started-guide",
    "description": "Complete guide for beginners",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "articles": [
    {
      "id": 122,
      "title": "Introduction",
      "slug": "introduction",
      "position_in_series": 1,
      "author_username": "author123",
      "published_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Topic Management (Hierarchical)

### GET /api/articles/topics
**Purpose:** List topics with hierarchical structure and access control

**Query Parameters:**
- `parent_id` (number, optional): Filter by parent topic ID for hierarchical browsing
- `include_articles` (string, default: 'false'): Include article counts for each topic

**Access Control:** Uses `checkTopicAccess` function for fine-grained permissions

**Hierarchical Structure:**
```sql
SELECT t.id, t.name, t.slug, t.description, t.parent_id, t.product_category_id,
       t.meta_title, t.meta_description, t.sort_order, t.created_at, t.updated_at,
       parent.name as parent_name
FROM article_topics t
LEFT JOIN article_topics parent ON t.parent_id = parent.id
WHERE t.parent_id = ? -- (if filtering by parent)
ORDER BY t.sort_order ASC, t.name ASC
```

### GET /api/articles/topics/:slug
**Purpose:** Get single topic with comprehensive details and access control

**Response Includes:**
- Topic metadata and SEO data
- Parent topic information
- Child topics list
- Article count in topic
- Recent articles (5 most recent)

**Child Topics Query:**
```sql
SELECT id, name, slug, description
FROM article_topics
WHERE parent_id = ?
ORDER BY sort_order ASC, name ASC
```

### POST /api/articles/topics
**Purpose:** Create new topic with hierarchical support and access restrictions

**Authentication:** Required - JWT token + topic management permissions

**Request Body Structure:**
```json
{
  "name": "Topic Name",
  "description": "Topic description",
  "parent_id": 123,
  "product_category_id": 456,
  "meta_title": "SEO Title",
  "meta_description": "SEO Description",
  "sort_order": 10,
  "restrictions": [
    {
      "type": "user_type",
      "value": "artist",
      "logic_operator": "any_of"
    },
    {
      "type": "permission",
      "value": "premium_content",
      "logic_operator": "any_of"
    }
  ]
}
```

**Access Restriction Types:**
- `user_type`: Restrict by user role (artist, promoter, community, admin)
- `permission`: Restrict by specific permission
- `specific_user`: Restrict to specific user ID

### PUT /api/articles/topics/:id
**Purpose:** Update existing topic with full metadata support

**Authentication:** Required - JWT token + topic management permissions

**Update Process:**
1. Validate topic exists
2. Update topic metadata
3. Replace access restrictions

### DELETE /api/articles/topics/:id
**Purpose:** Delete topic with validation for articles and child topics

**Authentication:** Required - JWT token + topic management permissions

**Validation Checks:**
1. **Articles Check:** Prevents deletion if topic has articles
2. **Child Topics Check:** Prevents deletion if topic has child topics
3. **Error Messages:** Clear guidance for reassignment

### GET /api/articles/topics/:id/articles
**Purpose:** Get paginated list of articles in specific topic

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of articles per page
- `status` (string, default: 'published'): Article status filter

**Access Control:** Validates both topic access and individual article access

## Access Control System

### Article Access Control
**Function:** `checkArticleAccess(userId, roles, permissions, articleId)`

**Restriction Types:**
- `user_type`: User role-based access
- `permission`: Specific permission requirements
- `specific_user`: Individual user access

**Logic Flow:**
1. Query article restrictions
2. If no restrictions → Public access
3. Check each restriction against user credentials
4. Return true if any restriction matches

### Topic Access Control
**Function:** `checkTopicAccess(userId, roles, permissions, topicId)`

**Same logic as article access but for topics**

**Hierarchical Implications:** Child topic access doesn't inherit parent restrictions

## Utility Functions

### generateSlug(title)
**Purpose:** Create URL-friendly slugs from titles

**Algorithm:**
1. Convert to lowercase
2. Replace non-alphanumeric with hyphens
3. Remove leading/trailing hyphens
4. Truncate to 100 characters

**Uniqueness:** Adds numeric suffix if slug exists

### calculateReadingTime(content)
**Purpose:** Estimate reading time for articles

**Formula:** `Math.ceil(wordCount / 200)` (200 words per minute)

**Usage:** Automatically calculated on article creation/update

## Environment Variables

No environment variables are directly used in this file. All configuration comes from:
- Database connection settings
- JWT secret (via middleware)
- File upload configuration (via multer)

## Security Considerations

### Authentication & Authorization
- **JWT Middleware:** Validates user tokens for protected endpoints
- **Permission Checks:** Multiple middleware functions for different permission levels
- **Role-Based Access:** Admin, content manager, author, user hierarchy
- **Fine-Grained Control:** Article and topic-level access restrictions

### Input Validation
- **Required Fields:** Validates essential data before processing
- **SQL Injection Protection:** Parameterized queries throughout
- **Slug Validation:** Prevents duplicate slugs and invalid characters
- **Permission Validation:** Checks user permissions before operations

### Data Integrity
- **Cascade Handling:** Proper cleanup of related records
- **Unique Constraints:** Prevents duplicate slugs and relationships
- **Status Validation:** Ensures proper article lifecycle management
- **Hierarchy Validation:** Prevents circular references in topic hierarchy

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Optimized queries on slug, status, published_at
- **Pagination:** Efficient pagination for large datasets
- **Join Optimization:** Strategic LEFT JOINs for related data
- **Count Queries:** Separate count queries for pagination metadata

### Caching Opportunities
- **Tag Lists:** Tag listings with counts (rarely change)
- **Topic Hierarchy:** Topic structure (changes infrequently)
- **Popular Articles:** Most viewed articles
- **Series Navigation:** Series article lists

### Query Optimization
- **Selective Fields:** Only query needed fields
- **Conditional Queries:** Build queries based on parameters
- **Batch Operations:** Efficient handling of multiple relationships
- **Access Control Filtering:** Early filtering based on permissions

## Error Handling

### Validation Errors
- **400 Bad Request:** Missing required fields, invalid data
- **404 Not Found:** Article, tag, topic, or series not found
- **409 Conflict:** Duplicate slugs or constraint violations

### Permission Errors
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Insufficient permissions for operation

### System Errors
- **500 Internal Server Error:** Database errors, system failures
- **Comprehensive Logging:** Error details logged for debugging

## Usage Examples

### Create Article with Full Metadata
```javascript
const articleData = {
  title: "Complete Guide to Digital Art",
  content: "Full article content with detailed information...",
  excerpt: "Learn everything about digital art creation",
  status: "published",
  topics: [1, 5, 12], // Art, Digital, Tutorials
  tags: [3, 7, 15], // Beginner, Software, Creative
  series_id: 2,
  position_in_series: 3,
  connections: [
    {type: "related_product", id: 456},
    {type: "related_event", id: 789}
  ],
  seo: {
    meta_title: "Digital Art Guide - Complete Tutorial",
    meta_description: "Comprehensive guide to digital art creation",
    meta_keywords: "digital art, tutorial, beginner, software",
    focus_keyword: "digital art"
  },
  social: {
    og_title: "Master Digital Art Creation",
    og_description: "Step-by-step guide to creating amazing digital art",
    twitter_card_type: "summary_large_image"
  }
};

const response = await fetch('/api/articles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(articleData)
});
```

### Create Hierarchical Topic Structure
```javascript
// Create parent topic
const parentTopic = {
  name: "Digital Art",
  description: "All about digital art creation",
  meta_title: "Digital Art - Tutorials and Guides",
  meta_description: "Learn digital art techniques and tools",
  sort_order: 1,
  restrictions: [
    {
      type: "user_type",
      value: "artist",
      logic_operator: "any_of"
    }
  ]
};

// Create child topic
const childTopic = {
  name: "Digital Painting",
  description: "Digital painting techniques and tutorials",
  parent_id: parentTopicId,
  sort_order: 1
};
```

### Query Articles with Access Control
```javascript
// Get articles for authenticated user
const getArticlesForUser = async (userId, roles, permissions) => {
  const articles = await db.query(`
    SELECT a.* FROM articles a
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC
  `);
  
  // Filter based on access control
  const accessibleArticles = [];
  for (const article of articles) {
    const hasAccess = await checkArticleAccess(userId, roles, permissions, article.id);
    if (hasAccess) {
      accessibleArticles.push(article);
    }
  }
  
  return accessibleArticles;
};
```

### Series Navigation Implementation
```javascript
// Get series navigation for article
const getSeriesNavigation = async (articleId) => {
  const [series] = await db.query(`
    SELECT s.*, asr.position_in_series
    FROM article_series s
    JOIN article_series_relations asr ON s.id = asr.series_id
    WHERE asr.article_id = ?
  `, [articleId]);
  
  if (!series[0]) return null;
  
  const currentPosition = series[0].position_in_series;
  
  // Get previous and next articles
  const [prevArticle] = await db.query(`
    SELECT a.id, a.title, a.slug
    FROM articles a
    JOIN article_series_relations asr ON a.id = asr.article_id
    WHERE asr.series_id = ? AND asr.position_in_series = ?
  `, [series[0].id, currentPosition - 1]);
  
  const [nextArticle] = await db.query(`
    SELECT a.id, a.title, a.slug
    FROM articles a
    JOIN article_series_relations asr ON a.id = asr.article_id
    WHERE asr.series_id = ? AND asr.position_in_series = ?
  `, [series[0].id, currentPosition + 1]);
  
  return {
    ...series[0],
    prev_article: prevArticle[0] || null,
    next_article: nextArticle[0] || null
  };
};
```

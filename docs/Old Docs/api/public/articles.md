# Article Management API

## Overview
The Beemeeart Article Management API provides comprehensive content management capabilities including articles, tags, topics, series, and access control. This API supports hierarchical content organization, SEO optimization, social media integration, and fine-grained access control for different user types.

## Authentication
Most endpoints require JWT token authentication. Public endpoints are clearly marked. Content management operations require additional permissions.

## Base URL
```
https://api.beemeeart.com/articles
```

## Content Organization

The article system supports multiple organizational structures:
- **Articles:** Main content pieces with rich metadata
- **Topics:** Hierarchical categorization system
- **Tags:** Flat labeling system for cross-cutting themes
- **Series:** Ordered collections of related articles

## Article Management

### List Articles
`GET /api/articles`

Get paginated list of articles with optional filtering.

**Authentication:** Optional - JWT token for role-based filtering

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of articles per page

**Response (200 OK):**
```json
{
  "articles": [
    {
      "id": 123,
      "title": "Getting Started with Digital Art",
      "content": "Full article content...",
      "excerpt": "Learn the basics of digital art creation",
      "author_id": 456,
      "published_at": "2024-01-15T10:30:00Z",
      "status": "published",
      "slug": "getting-started-with-digital-art",
      "page_type": "article",
      "featured_image_id": 789,
      "created_at": "2024-01-14T15:20:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "author_username": "artist123"
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

**Access Control:**
- **Anonymous/Users:** Only published articles
- **Admins:** All articles regardless of status

### Get Single Article
`GET /api/articles/{slug}`

Get complete article data with metadata and navigation.

**Authentication:** Optional - JWT token for access control

**Parameters:**
- `slug` (path): Article URL slug

**Response (200 OK):**
```json
{
  "article": {
    "id": 123,
    "title": "Getting Started with Digital Art",
    "content": "Full article content with detailed information...",
    "excerpt": "Learn the basics of digital art creation",
    "author_id": 456,
    "published_at": "2024-01-15T10:30:00Z",
    "status": "published",
    "slug": "getting-started-with-digital-art",
    "author_username": "artist123",
    "author_display_name": "Jane Artist",
    "meta_title": "Digital Art Guide - Complete Tutorial",
    "meta_description": "Comprehensive guide to digital art creation",
    "meta_keywords": "digital art, tutorial, beginner",
    "og_title": "Master Digital Art Creation",
    "og_description": "Step-by-step guide to creating amazing digital art",
    "twitter_card_type": "summary_large_image",
    "view_count": 1250,
    "reading_time_minutes": 8,
    "topics": [
      {
        "id": 1,
        "name": "Digital Art",
        "slug": "digital-art"
      }
    ],
    "tags": [
      {
        "id": 3,
        "name": "Beginner",
        "slug": "beginner"
      }
    ],
    "series": {
      "id": 2,
      "series_name": "Art Fundamentals",
      "slug": "art-fundamentals",
      "position_in_series": 1,
      "total_articles": 5,
      "prev_article": null,
      "next_article": {
        "id": 124,
        "title": "Color Theory Basics",
        "slug": "color-theory-basics"
      }
    },
    "connections": [
      {
        "connection_type": "related_product",
        "connection_id": 456
      }
    ]
  }
}
```

**Features:**
- Complete article metadata
- Author information
- SEO and social media data
- Analytics (view count, reading time)
- Associated topics and tags
- Series navigation (prev/next articles)
- Related content connections
- **Auto View Tracking:** Updates view count on access

### Create Article
`POST /api/articles`

Create new article with comprehensive metadata.

**Authentication:** Required - JWT token + content management permissions

**Request Body:**
```json
{
  "title": "Getting Started with Digital Art",
  "content": "Full article content with detailed information...",
  "excerpt": "Learn the basics of digital art creation",
  "status": "draft",
  "topics": [1, 5, 12],
  "tags": [3, 7, 15],
  "series_id": 2,
  "position_in_series": 1,
  "connections": [
    {
      "type": "related_product",
      "id": 456
    },
    {
      "type": "related_event",
      "id": 789
    }
  ],
  "seo": {
    "meta_title": "Digital Art Guide - Complete Tutorial",
    "meta_description": "Comprehensive guide to digital art creation",
    "meta_keywords": "digital art, tutorial, beginner, software",
    "focus_keyword": "digital art"
  },
  "social": {
    "og_title": "Master Digital Art Creation",
    "og_description": "Step-by-step guide to creating amazing digital art",
    "twitter_card_type": "summary_large_image"
  }
}
```

**Required Fields:**
- `title` (string): Article title
- `content` (string): Article content

**Optional Fields:**
- `excerpt` (string): Brief summary
- `status` (string): 'draft' or 'published' (default: 'draft')
- `topics` (array): Topic IDs array
- `tags` (array): Tag IDs array
- `series_id` (number): Series ID if part of series
- `position_in_series` (number): Position in series
- `connections` (array): Related content connections
- `seo` (object): SEO metadata
- `social` (object): Social media metadata

**Response (201 Created):**
```json
{
  "message": "Article created successfully",
  "article": {
    "id": 123,
    "slug": "getting-started-with-digital-art",
    "title": "Getting Started with Digital Art",
    "status": "draft"
  }
}
```

**Features:**
- **Automatic Slug Generation:** Creates URL-friendly slug from title
- **Reading Time Calculation:** Estimates reading time (200 words/minute)
- **Unique Slug Handling:** Adds numeric suffix if slug exists
- **Comprehensive Metadata:** Supports SEO, social, and organizational data

### Update Article
`PUT /api/articles/{id}`

Update existing article with comprehensive permission checking.

**Authentication:** Required - JWT token

**Parameters:**
- `id` (path): Article ID to update

**Request Body:** Same structure as POST (all fields optional)

**Permission Logic:**
- **Authors:** Can edit their own articles
- **Content Managers:** Can edit any article
- **Publishing:** Requires content management permissions

**Response (200 OK):**
```json
{
  "message": "Article updated successfully"
}
```

**Features:**
- **Selective Updates:** Only updates provided fields
- **Reading Time Recalculation:** Updates if content changes
- **Status Management:** Handles draft/published workflow
- **Relationship Updates:** Updates topics, tags, series, connections

### Delete Article
`DELETE /api/articles/{id}`

Delete article with permission validation.

**Authentication:** Required - JWT token

**Parameters:**
- `id` (path): Article ID to delete

**Permission Logic:**
- **Authors:** Can delete their own articles
- **Admins:** Can delete any article

**Response (200 OK):**
```json
{
  "message": "Article deleted successfully"
}
```

**Note:** Cascade deletion handles related records automatically.

### Track Article View
`POST /api/articles/{id}/view`

Update view count for article analytics.

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path): Article ID to track view for

**Response (200 OK):**
```json
{
  "success": true
}
```

**Note:** Updates view count and last viewed timestamp for analytics.

## Tag Management

### List Tags
`GET /api/articles/tags`

Get all article tags with article counts.

**Authentication:** None required (public endpoint)

**Response (200 OK):**
```json
[
  {
    "id": 3,
    "name": "Beginner",
    "slug": "beginner",
    "created_at": "2024-01-01T00:00:00Z",
    "article_count": 25
  },
  {
    "id": 7,
    "name": "Advanced",
    "slug": "advanced",
    "created_at": "2024-01-01T00:00:00Z",
    "article_count": 12
  }
]
```

### Get Tag with Articles
`GET /api/articles/tags/{slug}`

Get single tag with associated articles.

**Authentication:** None required (public endpoint)

**Parameters:**
- `slug` (path): Tag slug identifier

**Query Parameters:**
- `page` (number, default: 1): Page number for article pagination
- `limit` (number, default: 10): Number of articles per page

**Response (200 OK):**
```json
{
  "tag": {
    "id": 3,
    "name": "Beginner",
    "slug": "beginner",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "articles": [
    {
      "id": 123,
      "title": "Getting Started with Digital Art",
      "slug": "getting-started-with-digital-art",
      "excerpt": "Learn the basics of digital art creation",
      "author_id": 456,
      "published_at": "2024-01-15T10:30:00Z",
      "author_username": "artist123",
      "author_display_name": "Jane Artist",
      "view_count": 1250,
      "reading_time_minutes": 8
    }
  ]
}
```

### Create Tag
`POST /api/articles/tags`

Create new article tag.

**Authentication:** Required - JWT token + content management permissions

**Request Body:**
```json
{
  "tag_name": "Digital Photography",
  "description": "Photography techniques and tips"
}
```

**Required Fields:**
- `tag_name` (string): Tag name

**Response (201 Created):**
```json
{
  "id": 15,
  "name": "Digital Photography",
  "slug": "digital-photography",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Features:**
- **Automatic Slug Generation:** Creates URL-friendly slug
- **Duplicate Prevention:** Checks for existing slugs

### Update Tag
`PUT /api/articles/tags/{id}`

Update existing article tag.

**Authentication:** Required - JWT token + content management permissions

**Parameters:**
- `id` (path): Tag ID to update

**Request Body:**
```json
{
  "tag_name": "Updated Tag Name",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "id": 15,
  "name": "Updated Tag Name",
  "slug": "updated-tag-name",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Delete Tag
`DELETE /api/articles/tags/{id}`

Delete article tag and all relationships.

**Authentication:** Required - JWT token + content management permissions

**Parameters:**
- `id` (path): Tag ID to delete

**Response (200 OK):**
```json
{
  "message": "Tag deleted successfully"
}
```

**Note:** Removes all tag-article relationships before deletion.

## Series Management

### List Series
`GET /api/articles/series`

Get all article series with pagination.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of series per page

**Response (200 OK):**
```json
{
  "series": [
    {
      "id": 2,
      "series_name": "Art Fundamentals",
      "slug": "art-fundamentals",
      "description": "Complete guide to art basics",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "article_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

### Get Series with Articles
`GET /api/articles/series/{slug}`

Get single series with all articles in order.

**Authentication:** Optional - JWT token for access control

**Parameters:**
- `slug` (path): Series slug identifier

**Response (200 OK):**
```json
{
  "series": {
    "id": 2,
    "series_name": "Art Fundamentals",
    "slug": "art-fundamentals",
    "description": "Complete guide to art basics",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "articles": [
    {
      "id": 123,
      "title": "Getting Started with Digital Art",
      "slug": "getting-started-with-digital-art",
      "excerpt": "Learn the basics of digital art creation",
      "author_id": 456,
      "status": "published",
      "published_at": "2024-01-15T10:30:00Z",
      "author_username": "artist123",
      "author_display_name": "Jane Artist",
      "view_count": 1250,
      "reading_time_minutes": 8,
      "position_in_series": 1
    }
  ]
}
```

**Features:**
- **Ordered Articles:** Articles sorted by position in series
- **Access Control:** Filters articles based on user permissions
- **Complete Metadata:** Includes author and analytics data

## Topic Management (Hierarchical)

### List Topics
`GET /api/articles/topics`

Get topics with hierarchical structure and access control.

**Authentication:** Optional - JWT token for access control

**Query Parameters:**
- `parent_id` (number, optional): Filter by parent topic ID
- `include_articles` (string, default: 'false'): Include article counts

**Response (200 OK):**
```json
{
  "topics": [
    {
      "id": 1,
      "name": "Digital Art",
      "slug": "digital-art",
      "description": "All about digital art creation",
      "parent_id": null,
      "product_category_id": 123,
      "meta_title": "Digital Art - Tutorials and Guides",
      "meta_description": "Learn digital art techniques and tools",
      "sort_order": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "parent_name": null,
      "article_count": 15
    },
    {
      "id": 5,
      "name": "Digital Painting",
      "slug": "digital-painting",
      "description": "Digital painting techniques",
      "parent_id": 1,
      "sort_order": 1,
      "parent_name": "Digital Art",
      "article_count": 8
    }
  ]
}
```

**Features:**
- **Hierarchical Structure:** Parent-child topic relationships
- **Access Control:** Respects topic restrictions
- **SEO Support:** Meta titles and descriptions
- **Flexible Filtering:** Filter by parent for navigation

### Get Single Topic
`GET /api/articles/topics/{slug}`

Get topic with comprehensive details and access control.

**Authentication:** Optional - JWT token for access control

**Parameters:**
- `slug` (path): Topic slug identifier

**Response (200 OK):**
```json
{
  "topic": {
    "id": 1,
    "name": "Digital Art",
    "slug": "digital-art",
    "description": "All about digital art creation",
    "parent_id": null,
    "product_category_id": 123,
    "meta_title": "Digital Art - Tutorials and Guides",
    "meta_description": "Learn digital art techniques and tools",
    "sort_order": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "parent_name": null,
    "parent_slug": null,
    "child_topics": [
      {
        "id": 5,
        "name": "Digital Painting",
        "slug": "digital-painting",
        "description": "Digital painting techniques"
      }
    ],
    "article_count": 15,
    "recent_articles": [
      {
        "id": 123,
        "title": "Getting Started with Digital Art",
        "slug": "getting-started-with-digital-art",
        "excerpt": "Learn the basics of digital art creation",
        "published_at": "2024-01-15T10:30:00Z",
        "author_username": "artist123",
        "author_display_name": "Jane Artist"
      }
    ]
  }
}
```

**Features:**
- **Complete Hierarchy:** Parent and child topic information
- **Recent Content:** 5 most recent articles in topic
- **SEO Metadata:** Complete SEO information
- **Access Control:** Respects topic access restrictions

### Get Topic Articles
`GET /api/articles/topics/{id}/articles`

Get paginated list of articles in specific topic.

**Authentication:** Optional - JWT token for access control

**Parameters:**
- `id` (path): Topic ID

**Query Parameters:**
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Number of articles per page
- `status` (string, default: 'published'): Article status filter

**Response (200 OK):**
```json
{
  "articles": [
    {
      "id": 123,
      "title": "Getting Started with Digital Art",
      "slug": "getting-started-with-digital-art",
      "excerpt": "Learn the basics of digital art creation",
      "author_id": 456,
      "status": "published",
      "published_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-14T15:20:00Z",
      "author_username": "artist123",
      "author_display_name": "Jane Artist",
      "view_count": 1250,
      "reading_time_minutes": 8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

**Features:**
- **Access Control:** Validates both topic and article access
- **Complete Metadata:** Includes author and analytics data
- **Flexible Filtering:** Filter by article status

### Create Topic
`POST /api/articles/topics`

Create new topic with hierarchical support and access restrictions.

**Authentication:** Required - JWT token + topic management permissions

**Request Body:**
```json
{
  "name": "Digital Painting",
  "description": "Digital painting techniques and tutorials",
  "parent_id": 1,
  "product_category_id": 456,
  "meta_title": "Digital Painting Tutorials",
  "meta_description": "Learn digital painting techniques",
  "sort_order": 1,
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

**Required Fields:**
- `name` (string): Topic name

**Optional Fields:**
- `description` (string): Topic description
- `parent_id` (number): Parent topic ID for hierarchy
- `product_category_id` (number): Related product category
- `meta_title` (string): SEO meta title
- `meta_description` (string): SEO meta description
- `sort_order` (number): Display sort order
- `restrictions` (array): Access restriction rules

**Access Restriction Types:**
- `user_type`: Restrict by user role (artist, promoter, community, admin)
- `permission`: Restrict by specific permission
- `specific_user`: Restrict to specific user ID

**Response (201 Created):**
```json
{
  "message": "Topic created successfully",
  "topic": {
    "id": 15,
    "name": "Digital Painting",
    "slug": "digital-painting"
  }
}
```

### Update Topic
`PUT /api/articles/topics/{id}`

Update existing topic with full metadata support.

**Authentication:** Required - JWT token + topic management permissions

**Parameters:**
- `id` (path): Topic ID to update

**Request Body:** Same structure as POST (all fields optional)

**Response (200 OK):**
```json
{
  "message": "Topic updated successfully"
}
```

### Delete Topic
`DELETE /api/articles/topics/{id}`

Delete topic with validation for articles and child topics.

**Authentication:** Required - JWT token + topic management permissions

**Parameters:**
- `id` (path): Topic ID to delete

**Response (200 OK):**
```json
{
  "message": "Topic deleted successfully"
}
```

**Error Responses:**
- `400` - Topic has articles (reassign first)
- `400` - Topic has child topics (reassign first)

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, missing required fields)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions, access denied)
- `404` - Not Found (article, tag, topic, or series not found)
- `409` - Conflict (duplicate slugs)
- `500` - Internal Server Error (system error)

## Rate Limits
- **Public endpoints:** 1000 requests per hour per IP
- **Authenticated endpoints:** 2000 requests per hour per user
- **Content management:** 500 requests per hour per user

## Integration Examples

### Complete Article Creation Workflow
```javascript
// Create article with full metadata
const createArticle = async () => {
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

  const result = await response.json();
  console.log('Article created:', result.article.slug);
  return result;
};
```

### Topic Hierarchy Navigation
```javascript
// Build topic navigation tree
const buildTopicTree = async () => {
  // Get root topics
  const rootResponse = await fetch('/api/articles/topics?include_articles=true');
  const rootData = await rootResponse.json();
  const rootTopics = rootData.topics.filter(t => !t.parent_id);
  
  // Build tree structure
  const topicTree = [];
  for (const rootTopic of rootTopics) {
    // Get child topics
    const childResponse = await fetch(`/api/articles/topics?parent_id=${rootTopic.id}&include_articles=true`);
    const childData = await childResponse.json();
    
    topicTree.push({
      ...rootTopic,
      children: childData.topics
    });
  }
  
  return topicTree;
};
```

### Series Reading Progress
```javascript
// Track user progress through article series
const trackSeriesProgress = async (seriesSlug, userId) => {
  // Get series with all articles
  const response = await fetch(`/api/articles/series/${seriesSlug}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  const series = data.series;
  const articles = data.articles;
  
  // Track which articles user has read
  const readArticles = await getUserReadArticles(userId, articles.map(a => a.id));
  
  const progress = {
    series_name: series.series_name,
    total_articles: articles.length,
    read_articles: readArticles.length,
    progress_percentage: Math.round((readArticles.length / articles.length) * 100),
    next_article: articles.find(a => !readArticles.includes(a.id)),
    completed: readArticles.length === articles.length
  };
  
  return progress;
};
```

### Content Search with Filters
```javascript
// Advanced content search
const searchContent = async (query, filters = {}) => {
  const searchParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10
  });
  
  // Get articles
  const articlesResponse = await fetch(`/api/articles?${searchParams}`);
  const articlesData = await articlesResponse.json();
  
  // Filter by topic if specified
  let filteredArticles = articlesData.articles;
  if (filters.topic) {
    const topicResponse = await fetch(`/api/articles/topics/${filters.topic}/articles?${searchParams}`);
    const topicData = await topicResponse.json();
    filteredArticles = topicData.articles;
  }
  
  // Filter by tag if specified
  if (filters.tag) {
    const tagResponse = await fetch(`/api/articles/tags/${filters.tag}?${searchParams}`);
    const tagData = await tagResponse.json();
    filteredArticles = tagData.articles;
  }
  
  // Client-side text search (or implement server-side search)
  if (query) {
    filteredArticles = filteredArticles.filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return {
    articles: filteredArticles,
    pagination: articlesData.pagination,
    filters: filters
  };
};
```

### Article Analytics Dashboard
```javascript
// Get article performance metrics
const getArticleAnalytics = async (articleId) => {
  // Get article with analytics
  const response = await fetch(`/api/articles/${articleId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  const article = data.article;
  
  const analytics = {
    title: article.title,
    slug: article.slug,
    published_at: article.published_at,
    view_count: article.view_count,
    reading_time_minutes: article.reading_time_minutes,
    topics: article.topics.map(t => t.name),
    tags: article.tags.map(t => t.name),
    series_info: article.series ? {
      name: article.series.series_name,
      position: article.series.position_in_series,
      total: article.series.total_articles
    } : null,
    engagement_metrics: {
      views_per_day: Math.round(article.view_count / getDaysSincePublished(article.published_at)),
      estimated_read_time: article.reading_time_minutes,
      topic_performance: article.topics.length,
      tag_diversity: article.tags.length
    }
  };
  
  return analytics;
};
```

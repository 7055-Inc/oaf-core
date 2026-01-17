# Articles System Documentation

## Overview

The OAF Articles System is a comprehensive content management solution that supports both blog articles and help documentation. It features rich text editing, SEO optimization, flexible access controls, and seamless integration with the existing user permissions system.

## System Architecture

### Core Components

1. **Articles Management** - Full CRUD operations with rich text editing
2. **Topics & Categories** - Hierarchical content organization
3. **Tags System** - Flexible content labeling
4. **Series Management** - Sequential content grouping
5. **SEO Optimization** - Comprehensive meta data and social sharing
6. **Access Control** - Permission-based content restrictions
7. **Analytics Tracking** - View counts and reading time calculation
8. **Cross-Module Integration** - Connections to users, events, and products

## Database Schema

### Core Tables

#### `articles` - Main content table
```sql
CREATE TABLE articles (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  content longtext NOT NULL,
  excerpt text,
  author_id bigint NOT NULL,
  status enum('draft','ready_to_publish','published') DEFAULT 'draft',
  site_menu_display enum('yes','no') DEFAULT 'no',
  site_blog_display enum('yes','no') DEFAULT 'yes',
  menu_order int DEFAULT 0,
  page_type enum('page','article','about','services','contact','help_article') DEFAULT 'article',
  featured_image_id bigint,
  published_at timestamp NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (featured_image_id) REFERENCES media_library(id) ON DELETE SET NULL
);
```

#### `article_topics` - Content categories
```sql
CREATE TABLE article_topics (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  name varchar(255) NOT NULL UNIQUE,
  slug varchar(255) NOT NULL UNIQUE,
  description text,
  parent_id bigint,
  product_category_id bigint,
  featured_image_id bigint,
  meta_title varchar(255),
  meta_description text,
  sort_order int DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES article_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (featured_image_id) REFERENCES media_library(id) ON DELETE SET NULL
);
```

#### `article_tags` - Flexible labeling system
```sql
CREATE TABLE article_tags (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  name varchar(100) NOT NULL UNIQUE,
  slug varchar(100) NOT NULL UNIQUE,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);
```

#### `article_series` - Sequential content grouping
```sql
CREATE TABLE article_series (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  series_name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  description text,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### SEO & Social Tables

#### `article_seo` - Search engine optimization
```sql
CREATE TABLE article_seo (
  article_id bigint PRIMARY KEY,
  meta_title varchar(255),
  meta_description text,
  meta_keywords varchar(500),
  focus_keyword varchar(100),
  canonical_url varchar(500),
  robots_directives varchar(100),
  readability_score int,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

#### `article_social` - Social media optimization
```sql
CREATE TABLE article_social (
  article_id bigint PRIMARY KEY,
  og_title varchar(255),
  og_description text,
  og_image_id bigint,
  twitter_card_type enum('summary', 'summary_large_image', 'app', 'player') DEFAULT 'summary',
  twitter_image_id bigint,
  twitter_title varchar(255),
  twitter_description text,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (og_image_id) REFERENCES media_library(id) ON DELETE SET NULL,
  FOREIGN KEY (twitter_image_id) REFERENCES media_library(id) ON DELETE SET NULL
);
```

### Access Control & Analytics

#### `article_restrictions` - Content access control
```sql
CREATE TABLE article_restrictions (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  article_id bigint NOT NULL,
  restriction_type enum('user_type', 'permission', 'specific_user') NOT NULL,
  restriction_value varchar(255) NOT NULL,
  logic_operator enum('any_of', 'must_meet_all') DEFAULT 'any_of',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

#### `article_analytics` - Performance tracking
```sql
CREATE TABLE article_analytics (
  article_id bigint PRIMARY KEY,
  view_count int DEFAULT 0,
  reading_time_minutes int,
  last_viewed timestamp NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

### Relationship Tables

#### `article_topic_relations` - Article-Topic connections
```sql
CREATE TABLE article_topic_relations (
  article_id bigint NOT NULL,
  topic_id bigint NOT NULL,
  PRIMARY KEY (article_id, topic_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES article_topics(id) ON DELETE CASCADE
);
```

#### `article_tag_relations` - Article-Tag connections
```sql
CREATE TABLE article_tag_relations (
  article_id bigint NOT NULL,
  tag_id bigint NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES article_tags(id) ON DELETE CASCADE
);
```

#### `article_series_relations` - Series membership
```sql
CREATE TABLE article_series_relations (
  article_id bigint NOT NULL,
  series_id bigint NOT NULL,
  position_in_series decimal(10,2) NOT NULL,
  PRIMARY KEY (article_id, series_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (series_id) REFERENCES article_series(id) ON DELETE CASCADE
);
```

#### `article_connections` - Cross-module references
```sql
CREATE TABLE article_connections (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  article_id bigint NOT NULL,
  connection_type enum('user', 'event', 'product', 'category', 'custom') NOT NULL,
  connection_id bigint NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
```

## Permission System Integration

### Required Permissions

The articles system integrates with the main permissions system through these permission flags:

- **`create_articles`** - Create new articles and drafts
- **`publish_articles`** - Publish articles and manage all articles
- **`manage_articles_seo`** - Access SEO settings and optimization tools
- **`manage_articles_topics`** - Manage topics, categories, and organization

### Access Control Logic

#### Dashboard Menu Access
- **Articles Menu**: Visible if user has ANY of: `create_articles`, `publish_articles`, `manage_articles_seo`, `manage_articles_topics`

#### Feature Access
- **My Articles**: `create_articles` OR `publish_articles` OR admin
- **All Articles**: `publish_articles` OR admin
- **Topics Management**: `manage_articles_topics` OR admin
- **SEO Settings**: `manage_articles_seo` OR admin

#### Content Restrictions
- **Public Content**: No restrictions applied
- **User Type Restrictions**: Limit to specific user types (artist, promoter, community, admin)
- **Permission-based Access**: Require specific permissions to view
- **Individual User Access**: Grant access to specific user IDs
- **Logic Operators**: 'any_of' (OR) or 'must_meet_all' (AND) for multiple restrictions

## API Endpoints

### Articles Management
- **GET /api/articles** - List articles (with pagination and filtering)
- **GET /api/articles/:id** - Get single article
- **POST /api/articles** - Create new article
- **PUT /api/articles/:id** - Update article
- **DELETE /api/articles/:id** - Delete article

### Topics Management
- **GET /api/articles/topics** - List all topics
- **POST /api/articles/topics** - Create new topic
- **PUT /api/articles/topics/:id** - Update topic
- **DELETE /api/articles/topics/:id** - Delete topic

### Tags Management
- **GET /api/articles/tags** - List all tags
- **POST /api/articles/tags** - Create new tag
- **PUT /api/articles/tags/:id** - Update tag
- **DELETE /api/articles/tags/:id** - Delete tag

### Series Management
- **GET /api/articles/series** - List all series
- **POST /api/articles/series** - Create new series
- **PUT /api/articles/series/:id** - Update series
- **DELETE /api/articles/series/:id** - Delete series

## Frontend Components

### Admin Interface
- **`ArticleManagement.js`** - Main articles management interface
- **`WYSIWYGEditor.js`** - Rich text editor with media upload
- **Dashboard integration** - Articles menu in main dashboard

### Public Interface
- **`/articles`** - Articles listing page
- **`/articles/[slug]`** - Individual article pages
- **`/articles/topic/[slug]`** - Topic archive pages
- **`/articles/series/[slug]`** - Series archive pages

## Content Types

### Article Types
- **`article`** - Standard blog posts
- **`page`** - Static pages
- **`help_article`** - Help documentation
- **`about`** - About pages
- **`services`** - Service pages
- **`contact`** - Contact pages

### Status Workflow
1. **`draft`** - Work in progress, not visible to public
2. **`ready_to_publish`** - Ready for review/publishing
3. **`published`** - Live and visible to authorized users

## SEO Features

### Meta Data Management
- **Title Tags** - Custom meta titles with fallback to article title
- **Meta Descriptions** - Custom descriptions for search results
- **Meta Keywords** - Keyword targeting (legacy support)
- **Focus Keywords** - Primary SEO target keywords
- **Canonical URLs** - Prevent duplicate content issues
- **Robots Directives** - Control search engine indexing

### Social Media Optimization
- **Open Graph** - Facebook and LinkedIn sharing optimization
- **Twitter Cards** - Twitter sharing with rich media
- **Custom Images** - Specific images for social sharing
- **Custom Titles/Descriptions** - Platform-specific content

### Schema Markup
- **Article Schema** - Structured data for search engines
- **Author Schema** - Author information markup
- **Organization Schema** - Company/organization data
- **Custom Schema** - Flexible schema field support

## Media Integration

### Image Management
- **Featured Images** - Main article images
- **Inline Media** - Images and videos within content
- **Media SEO** - Alt text, captions, and descriptions
- **Social Images** - Specific images for social sharing

### Media Library Integration
- **Existing Media** - Browse uploaded media library
- **Upload Interface** - Direct upload from article editor
- **SEO Optimization** - Comprehensive media metadata

## Cross-Module Integration

### User Integration
- **Author Pages** - Articles by specific authors
- **User Connections** - Link articles to user profiles
- **Permission Inheritance** - User-based access control

### Event Integration
- **Event Articles** - Articles connected to specific events
- **Timeline Integration** - Event-related content organization
- **Cross-references** - Bidirectional linking

### Product Integration
- **Product Articles** - Articles about specific products
- **Category Mapping** - Link to product categories
- **Featured Products** - Highlight products in articles

## Performance Features

### Optimization
- **Reading Time Calculation** - Automatic reading time estimation
- **Content Excerpts** - Smart content truncation
- **Image Lazy Loading** - Optimized page load times
- **Cache Headers** - Appropriate caching strategies

### Analytics
- **View Tracking** - Article view counts
- **Reading Analytics** - Time-based engagement metrics
- **Performance Monitoring** - Content performance tracking

## Security Features

### Input Sanitization
- **XSS Prevention** - Rich text content sanitization
- **SQL Injection Prevention** - Parameterized queries
- **CSRF Protection** - All forms protected with CSRF tokens

### Access Control
- **Permission Validation** - All endpoints check user permissions
- **Content Restrictions** - Flexible access control system
- **Admin Override** - Admin users can access all content

## URL Structure

### Public URLs
- **`/articles`** - Articles listing
- **`/articles/[slug]`** - Individual articles
- **`/articles/topic/[slug]`** - Topic archives
- **`/articles/series/[slug]`** - Series archives
- **`/articles/tag/[slug]`** - Tag archives
- **`/articles/author/[slug]`** - Author archives

### Admin URLs
- **`/dashboard`** - Main dashboard (includes articles menu)
- **`/articles/manage`** - Articles management interface

## Help Center Integration

The articles system serves as the foundation for the Help Center, with articles marked as `help_article` type and organized by help categories:

### Help Categories
- **Getting Started** - Onboarding and first steps
- **Account Management** - Profile and settings
- **Artist Tools** - Portfolio and sales (artist-only)
- **Event Management** - Event creation (promoter-only)
- **Payments & Orders** - Checkout and billing
- **Technical Support** - Troubleshooting guides
- **Platform Policies** - Terms and guidelines

## Usage Instructions

### For Content Creators
1. **Access Dashboard** - Navigate to `/dashboard` and click "Articles"
2. **Create Article** - Click "New Article" to open the editor
3. **Add Content** - Use the WYSIWYG editor for rich text and media
4. **Set SEO** - Configure meta data and social sharing
5. **Organize** - Assign topics, tags, and series
6. **Publish** - Set status to "published" when ready

### For Administrators
1. **Manage All Content** - Access all articles regardless of author
2. **Configure Topics** - Create and organize content categories
3. **Set Permissions** - Control who can create and publish content
4. **Monitor Analytics** - Track content performance and engagement
5. **Manage Access** - Set content restrictions and permissions

### For Developers
1. **API Integration** - Use REST endpoints for custom integrations
2. **Custom Fields** - Extend schema for specific needs
3. **Theme Integration** - Customize frontend display templates
4. **SEO Enhancement** - Implement additional schema markup
5. **Performance Optimization** - Add caching and optimization layers

## Technical Requirements

### Dependencies
- **Express.js** - API server framework
- **MySQL 8.0+** - Database with full Unicode support
- **Next.js** - Frontend framework
- **JWT Authentication** - User authentication system
- **CSRF Protection** - Form security middleware

### Performance Considerations
- **Database Indexing** - Optimized queries with proper indexes
- **Content Caching** - Appropriate cache headers and strategies
- **Image Optimization** - Lazy loading and responsive images
- **Search Optimization** - Full-text search capabilities

---

*This documentation reflects the current implementation of the articles system. The system is production-ready and fully integrated with the existing OAF platform architecture.*

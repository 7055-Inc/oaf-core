# Database Conventions Analysis

## 1. Example CREATE Statements

### Events Table (Main Entity)
```sql
CREATE TABLE `events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `promoter_id` bigint NOT NULL,
  `event_type_id` int NOT NULL,
  `parent_id` bigint DEFAULT NULL,
  `series_id` bigint DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `short_description` text,
  `event_status` enum('draft','active','archived','unclaimed','pre-draft','red_flag_removal') DEFAULT 'draft',
  `removal_requested_at` timestamp NULL DEFAULT NULL,
  `removal_reason` varchar(100) DEFAULT NULL,
  `removal_token` varchar(255) DEFAULT NULL,
  `application_status` enum('not_accepting','accepting','closed','jurying','artists_announced','event_completed') DEFAULT 'not_accepting',
  -- ... more fields ...
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` bigint NOT NULL,
  `updated_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `promoter_id` (`promoter_id`),
  KEY `event_type_id` (`event_type_id`),
  KEY `parent_id` (`parent_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`promoter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`event_type_id`) REFERENCES `event_types` (`id`),
  CONSTRAINT `events_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `events_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### Event Applications Table (Junction/Relationship)
```sql
CREATE TABLE `event_applications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint NOT NULL,
  `artist_id` bigint NOT NULL,
  `status` enum('draft','submitted','under_review','accepted','rejected','declined','confirmed','waitlisted') DEFAULT 'draft',
  `artist_statement` text,
  `portfolio_url` varchar(255) DEFAULT NULL,
  `booth_preferences` json DEFAULT NULL,
  -- ... more fields ...
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `persona_id` bigint DEFAULT NULL COMMENT 'Persona used for this application',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_artist_persona` (`event_id`,`artist_id`,`persona_id`),
  KEY `artist_id` (`artist_id`),
  KEY `jury_reviewed_by` (`jury_reviewed_by`),
  KEY `idx_booth_fee_due_date` (`booth_fee_due_date`),
  KEY `idx_booth_fee_status` (`booth_fee_paid`,`booth_fee_due_date`),
  KEY `idx_persona_applications` (`persona_id`),
  CONSTRAINT `event_applications_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_applications_ibfk_2` FOREIGN KEY (`artist_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_applications_ibfk_3` FOREIGN KEY (`jury_reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `event_applications_ibfk_4` FOREIGN KEY (`persona_id`) REFERENCES `artist_personas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### Application Email Log Table (Audit/Tracking)
```sql
CREATE TABLE `application_email_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `application_id` bigint NOT NULL,
  `email_type` varchar(50) NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `success` tinyint(1) DEFAULT '1',
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `idx_application_emails` (`application_id`,`email_type`),
  KEY `idx_email_type_date` (`email_type`,`sent_at`),
  CONSTRAINT `application_email_log_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## 2. Timestamp Patterns

### Standard Timestamp Fields
```sql
-- CONSISTENT PATTERN across all tables:
`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

-- Additional audit fields (when needed):
`created_by` bigint NOT NULL,
`updated_by` bigint DEFAULT NULL,

-- Specific action timestamps:
`submitted_at` timestamp NULL DEFAULT NULL,
`jury_reviewed_at` timestamp NULL DEFAULT NULL,
`sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
`last_login` timestamp NULL DEFAULT NULL,
```

### Timestamp Naming Conventions
- **Creation**: `created_at` (always present)
- **Updates**: `updated_at` (always present with ON UPDATE)
- **Specific Actions**: `{action}_at` (e.g., `submitted_at`, `sent_at`, `reviewed_at`)
- **User Tracking**: `{action}_by` (references users.id)

## 3. Foreign Key Naming Conventions

### Pattern Analysis
```sql
-- AUTOMATIC NAMING (MySQL default):
CONSTRAINT `events_ibfk_1` FOREIGN KEY (`promoter_id`) REFERENCES `users` (`id`)
CONSTRAINT `events_ibfk_2` FOREIGN KEY (`event_type_id`) REFERENCES `event_types` (`id`)

-- DESCRIPTIVE NAMING (newer tables):
CONSTRAINT `fk_products_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)

-- MIXED APPROACH:
-- Older tables: `tablename_ibfk_N` (MySQL auto-generated)
-- Newer tables: `fk_tablename_columnname` (descriptive)
```

### Foreign Key Actions
```sql
-- CASCADE for dependent data:
ON DELETE CASCADE ON UPDATE CASCADE

-- SET NULL for optional references:
ON DELETE SET NULL

-- Default (RESTRICT) for required references:
-- (no action specified)
```

## 4. Index Naming Patterns

### Basic Indexes (Foreign Keys)
```sql
-- Simple column name (most common):
KEY `promoter_id` (`promoter_id`),
KEY `artist_id` (`artist_id`),

-- Descriptive prefixes (newer tables):
KEY `fk_products_category_id` (`category_id`),
KEY `idx_search_active` (`status`,`created_at`),
```

### Composite Indexes
```sql
-- Descriptive naming with purpose:
KEY `idx_booth_fee_status` (`booth_fee_paid`,`booth_fee_due_date`),
KEY `idx_search_users` (`user_type`,`status`,`created_at`),
KEY `idx_marketplace_enabled` (`marketplace_enabled`,`marketplace_category`),

-- Functional naming:
KEY `idx_application_emails` (`application_id`,`email_type`),
KEY `idx_email_type_date` (`email_type`,`sent_at`),
```

### Unique Constraints
```sql
-- Descriptive unique constraints:
UNIQUE KEY `unique_event_artist_persona` (`event_id`,`artist_id`,`persona_id`),
UNIQUE KEY `vendor_sku_unique` (`vendor_id`,`sku`),
UNIQUE KEY `uk_products_sku` (`sku`),

-- Simple unique constraints:
UNIQUE KEY `username` (`username`),
```

### Special Indexes
```sql
-- Full-text search:
FULLTEXT KEY `name` (`name`,`description`),
FULLTEXT KEY `name_2` (`name`,`description`,`sku`),
```

## 5. Column Naming Conventions

### ID Fields
- **Primary Key**: `id` (always bigint AUTO_INCREMENT)
- **Foreign Keys**: `{table}_id` (e.g., `event_id`, `artist_id`, `promoter_id`)
- **Self-referencing**: `parent_id` (references same table)

### Status Fields
- **Main Status**: `status` or `{entity}_status` (e.g., `event_status`)
- **Boolean Flags**: `{action}_flag` or `has_{feature}` or `allow_{action}`
- **Enum Values**: snake_case with underscores

### Timestamp Fields
- **Standard**: `created_at`, `updated_at`
- **Action-specific**: `{action}_at` (e.g., `submitted_at`, `sent_at`)
- **User tracking**: `{action}_by` (e.g., `created_by`, `updated_by`)

### Data Fields
- **Text**: `description`, `{field}_description`, `{field}_info`
- **URLs**: `{purpose}_url` (e.g., `portfolio_url`, `rsvp_url`)
- **Amounts**: `{type}_fee`, `{type}_amount` (always decimal(10,2))
- **Dates**: `{purpose}_date` (e.g., `start_date`, `due_date`)

## 6. Table Naming Conventions

### Entity Tables
- **Singular nouns**: `user`, `event`, `product`
- **Compound entities**: `event_type`, `artist_persona`

### Junction Tables
- **Entity relationships**: `event_applications`, `user_permissions`
- **Many-to-many**: `{entity1}_{entity2}` (alphabetical order)

### Log/Audit Tables
- **Pattern**: `{entity}_{purpose}_log`
- **Examples**: `application_email_log`, `user_email_preference_log`

### System Tables
- **Descriptive**: `automation_logs`, `error_logs`, `user_logins`

## 7. Engine and Charset Standards

```sql
-- CONSISTENT across all tables:
ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_0900_ai_ci
```

## 8. Data Type Patterns

### Common Types
- **IDs**: `bigint` (primary keys, foreign keys)
- **Small IDs**: `int` (for lookup tables like event_types)
- **Money**: `decimal(10,2)` (always for currency)
- **Text**: `varchar(255)` (short), `text` (long)
- **Booleans**: `tinyint(1)` with DEFAULT '0'
- **Enums**: Explicit values, snake_case
- **JSON**: `json` (for flexible data)
- **Coordinates**: `decimal(10,8)` (latitude), `decimal(11,8)` (longitude)

This analysis shows a mature database with evolving conventions - older tables use MySQL defaults while newer tables use more descriptive naming patterns.

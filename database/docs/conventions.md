# Database Conventions

This document outlines the naming conventions, standards, and best practices used in the OAF database.

## Naming Conventions

### Tables
- Use plural, lowercase names with underscores
- Examples: `users`, `product_categories`, `cart_items`

### Columns
- Use lowercase with underscores
- Primary keys are named `id`
- Foreign keys are named `[table_name]_id`
- Timestamps are named `created_at` and `updated_at`
- Examples: `user_id`, `product_name`, `created_at`

### Indexes
- Primary indexes: `PRIMARY KEY`
- Foreign key indexes: `idx_[table]_[column]`
- Unique indexes: `uk_[table]_[column]`
- Examples: `idx_user_profiles_name`, `uk_products_sku`

### Constraints
- Foreign key constraints: `fk_[table]_[column]`
- Unique constraints: `uk_[table]_[column]`
- Examples: `fk_products_category_id`, `uk_categories_name`

## Data Types

### Primary Keys
- Use `bigint` with `AUTO_INCREMENT`
- Example: `id bigint NOT NULL AUTO_INCREMENT`

### Foreign Keys
- Use `bigint` to match primary keys
- Example: `user_id bigint NOT NULL`

### Text Fields
- Use `varchar(255)` for general text
- Use `text` for longer content
- Use `json` for structured data
- Examples: `name varchar(255)`, `description text`, `art_categories json`

### Numeric Fields
- Use `decimal(10,2)` for currency and measurements
- Use `int` for quantities and counts
- Examples: `price decimal(10,2)`, `quantity int`

### Boolean Fields
- Use `boolean` with `DEFAULT false`
- Example: `is_default boolean DEFAULT false`

### Enums
- Use `enum` for fixed sets of values
- Values should be lowercase
- Example: `status enum('active', 'inactive', 'suspended')`

### Timestamps
- Use `timestamp` with `DEFAULT CURRENT_TIMESTAMP`
- Use `ON UPDATE CURRENT_TIMESTAMP` for `updated_at`
- Example: `created_at timestamp DEFAULT CURRENT_TIMESTAMP`

## Constraints

### Primary Keys
- Every table must have a primary key
- Use `id` as the primary key name
- Make primary keys `NOT NULL`

### Foreign Keys
- All foreign keys should be indexed
- Use `NOT NULL` unless explicitly optional
- Example: `user_id bigint NOT NULL`

### Unique Constraints
- Use for fields that must be unique
- Can be single column or composite
- Examples: `username`, `(vendor_id, sku)`

## Default Values

### Timestamps
- `created_at`: `DEFAULT CURRENT_TIMESTAMP`
- `updated_at`: `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### Status Fields
- Use appropriate default status
- Example: `status enum('active', 'inactive') DEFAULT 'active'`

### Boolean Fields
- Default to `false` unless logically `true`
- Example: `is_default boolean DEFAULT false`

## Indexing Strategy

### Primary Indexes
- Every table has a primary key index
- Use `AUTO_INCREMENT` for sequential IDs

### Foreign Key Indexes
- Index all foreign key columns
- Use `idx_` prefix for foreign key indexes

### Performance Indexes
- Index frequently queried columns
- Index columns used in WHERE clauses
- Index columns used in JOIN conditions

### Unique Indexes
- Use `uk_` prefix for unique indexes
- Index columns that must be unique
- Index composite unique constraints

## Best Practices

### Data Integrity
- Use appropriate data types
- Set NOT NULL constraints where appropriate
- Use foreign key constraints
- Use unique constraints where needed

### Performance
- Index frequently queried columns
- Use appropriate field lengths
- Consider query patterns when designing indexes

### Maintainability
- Use consistent naming conventions
- Document complex constraints
- Keep related fields together
- Use meaningful default values

### Security
- Never store sensitive data in plain text
- Use appropriate access controls
- Log important changes
- Validate input data

## Last Updated
Generated from database on: $(date) 
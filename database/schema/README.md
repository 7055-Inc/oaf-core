# Database Schema

This directory contains the SQL schema files for the Online Art Festival database.

## Directory Structure

```
schema/
├── tables/
│   ├── user_management.sql
│   ├── product_management.sql
│   ├── order_processing.sql
│   ├── shopping_experience.sql
│   ├── vendor_management.sql
│   ├── media_content.sql
│   └── system_management.sql
└── README.md
```

## Schema Organization

The schema is organized into logical groups based on functionality:

1. **User Management**
   - Core user tables
   - User profiles
   - Authentication

2. **Product Management**
   - Product catalog
   - Categories
   - Product images
   - Variants

3. **Order Processing**
   - Orders
   - Order items
   - Addresses
   - Payment information

4. **Shopping Experience**
   - Shopping cart
   - Wishlists
   - Saved items

5. **Vendor Management**
   - Vendor profiles
   - Commission rates
   - Payment processing

6. **Media & Content**
   - Media library
   - Content pages
   - Image management

7. **System Management**
   - Settings
   - Sessions
   - Activity logs
   - Registration management

## Usage

1. **Creating Tables**
   ```sql
   -- Execute files in order of dependencies
   source tables/user_management.sql;
   source tables/product_management.sql;
   -- etc...
   ```

2. **Modifying Schema**
   - Create new migration files for changes
   - Include both up and down migrations
   - Follow naming conventions

3. **Documentation**
   - Keep schema documentation up to date
   - Document all constraints and relationships
   - Include examples where helpful

## Dependencies

Tables are organized to handle dependencies correctly:

1. **Core Tables**
   - `users`
   - `categories`
   - `products`

2. **Dependent Tables**
   - `user_profiles` → `users`
   - `product_images` → `products`
   - `order_items` → `orders`

3. **Junction Tables**
   - `product_categories`
   - `wishlist_items`

## Best Practices

1. **Naming**
   - Follow naming conventions
   - Use descriptive names
   - Be consistent

2. **Constraints**
   - Define all necessary constraints
   - Use appropriate foreign keys
   - Include unique constraints

3. **Indexes**
   - Index foreign keys
   - Index frequently queried columns
   - Use appropriate index types

4. **Documentation**
   - Comment complex queries
   - Document constraints
   - Include examples

## Maintenance

1. **Backups**
   - Regular schema backups
   - Version control
   - Migration history

2. **Updates**
   - Use migrations
   - Test changes
   - Document modifications

3. **Performance**
   - Monitor indexes
   - Optimize queries
   - Regular maintenance 
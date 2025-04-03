# Database Migrations

This directory contains database migration files for the Online Art Festival application.

## Directory Structure

```
migrations/
├── README.md
└── [timestamp]_[description].sql
```

## Migration Files

Migration files follow this naming convention:
- `YYYYMMDDHHMMSS_description.sql`
- Example: `20240331000000_create_users_table.sql`

Each migration file should contain:
1. Up migration (forward changes)
2. Down migration (rollback changes)

## Migration Process

1. **Creating Migrations**
   ```sql
   -- Migration: Create users table
   -- Description: Initial users table creation
   -- Date: 2024-03-31
   
   -- Up Migration
   CREATE TABLE users (
     id BIGINT PRIMARY KEY AUTO_INCREMENT,
     username VARCHAR(255) NOT NULL,
     -- other columns
   );
   
   -- Down Migration
   DROP TABLE IF EXISTS users;
   ```

2. **Running Migrations**
   ```bash
   # Apply all pending migrations
   mysql -u oafuser -p oaf < migrations/20240331000000_create_users_table.sql
   
   # Rollback specific migration
   mysql -u oafuser -p oaf < migrations/20240331000000_create_users_table_rollback.sql
   ```

## Best Practices

1. **File Organization**
   - One migration per file
   - Clear, descriptive names
   - Include timestamps

2. **Content**
   - Include both up and down migrations
   - Document changes
   - Test migrations

3. **Version Control**
   - Commit all migration files
   - Never modify existing migrations
   - Create new migrations for changes

4. **Testing**
   - Test up migrations
   - Test down migrations
   - Verify data integrity

## Common Operations

1. **Creating Tables**
   ```sql
   CREATE TABLE table_name (
     id BIGINT PRIMARY KEY AUTO_INCREMENT,
     -- columns
   );
   ```

2. **Modifying Tables**
   ```sql
   ALTER TABLE table_name
   ADD COLUMN column_name TYPE,
   MODIFY COLUMN column_name TYPE;
   ```

3. **Adding Indexes**
   ```sql
   CREATE INDEX index_name
   ON table_name (column_name);
   ```

4. **Adding Foreign Keys**
   ```sql
   ALTER TABLE table_name
   ADD CONSTRAINT fk_name
   FOREIGN KEY (column_name)
   REFERENCES referenced_table(id);
   ```

## Rollback Procedures

1. **Manual Rollback**
   ```sql
   -- Execute down migration
   DROP TABLE IF EXISTS table_name;
   ```

2. **Automated Rollback**
   ```bash
   # Use migration tool
   migrate down
   ```

## Troubleshooting

1. **Common Issues**
   - Missing dependencies
   - Constraint violations
   - Data type mismatches

2. **Solutions**
   - Check migration order
   - Verify constraints
   - Test in development

## Maintenance

1. **Regular Tasks**
   - Review migration history
   - Clean up old migrations
   - Update documentation

2. **Backup Procedures**
   - Backup before migrations
   - Test restore process
   - Document procedures

## Security

1. **Access Control**
   - Use appropriate permissions
   - Secure credentials
   - Audit changes

2. **Data Protection**
   - Backup sensitive data
   - Use encryption
   - Follow security best practices 
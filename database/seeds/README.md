# Database Seeds

This directory contains seed data files for the Online Art Festival database.

## Directory Structure

```
seeds/
├── README.md
├── development/
│   ├── users.sql
│   ├── products.sql
│   └── categories.sql
└── production/
    ├── initial_data.sql
    └── reference_data.sql
```

## Seed Data Organization

Seed data is organized into two main categories:

1. **Development Seeds**
   - Test data for development
   - Sample data for testing
   - Mock data for features

2. **Production Seeds**
   - Initial system data
   - Reference data
   - Default configurations

## Usage

1. **Development Environment**
   ```bash
   # Load all development seeds
   mysql -u oafuser -p oaf < seeds/development/users.sql
   mysql -u oafuser -p oaf < seeds/development/products.sql
   ```

2. **Production Environment**
   ```bash
   # Load production seeds
   mysql -u oafuser -p oaf < seeds/production/initial_data.sql
   ```

## Seed Data Types

1. **Reference Data**
   - Categories
   - Status codes
   - System settings

2. **Sample Data**
   - Test users
   - Sample products
   - Example orders

3. **Configuration Data**
   - System settings
   - Default values
   - Initial parameters

## Best Practices

1. **Data Organization**
   - Separate by environment
   - Clear file naming
   - Logical grouping

2. **Content**
   - Use realistic data
   - Include all required fields
   - Follow data constraints

3. **Version Control**
   - Track seed changes
   - Document updates
   - Maintain history

4. **Testing**
   - Verify data integrity
   - Test relationships
   - Check constraints

## Common Operations

1. **Inserting Data**
   ```sql
   INSERT INTO table_name (column1, column2)
   VALUES ('value1', 'value2');
   ```

2. **Updating Data**
   ```sql
   UPDATE table_name
   SET column1 = 'value1'
   WHERE condition;
   ```

3. **Deleting Data**
   ```sql
   DELETE FROM table_name
   WHERE condition;
   ```

## Data Maintenance

1. **Regular Tasks**
   - Update sample data
   - Refresh test data
   - Clean up old data

2. **Backup Procedures**
   - Backup before seeding
   - Document changes
   - Test restore process

## Security

1. **Data Protection**
   - No sensitive data
   - Use test credentials
   - Follow security guidelines

2. **Access Control**
   - Limit access
   - Use appropriate permissions
   - Audit changes

## Troubleshooting

1. **Common Issues**
   - Constraint violations
   - Missing dependencies
   - Data inconsistencies

2. **Solutions**
   - Check data order
   - Verify relationships
   - Test in isolation

## Documentation

1. **File Headers**
   ```sql
   -- Seed: Development Users
   -- Description: Sample user data for development
   -- Date: 2024-03-31
   ```

2. **Data Documentation**
   - Document data purpose
   - Explain relationships
   - Note dependencies

## Development Workflow

1. **Creating Seeds**
   - Start with reference data
   - Add sample data
   - Test relationships

2. **Updating Seeds**
   - Document changes
   - Test updates
   - Update documentation

3. **Review Process**
   - Code review
   - Data validation
   - Security check 
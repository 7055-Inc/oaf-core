# Online Art Festival Database Documentation

This directory contains all database-related documentation and files for the Online Art Festival application.

## Directory Structure

- `docs/` - Database documentation and guides
- `migrations/` - Database migration files
- `seeds/` - Database seed data files
- `schema/` - Database schema definitions and SQL files

## Database Overview

The Online Art Festival database is a MySQL database with the following specifications:

- **Host**: 10.128.0.31
- **Database Name**: oaf
- **User**: oafuser
- **Password**: oafpass

## Documentation Sections

1. [Schema Documentation](schema.md) - Detailed table structures and definitions
2. [Relationships](relationships.md) - Entity relationships and data flow
3. [Conventions](conventions.md) - Database naming and design conventions

## Getting Started

1. Review the schema documentation to understand the database structure
2. Check the migrations directory for any pending database changes
3. Use the seed files to populate test data

## Maintenance

- All database changes should be tracked in the migrations directory
- Schema changes should be documented in the appropriate SQL files
- Keep documentation up to date with any structural changes

## Security Notes

- Database credentials are stored in environment variables
- Never commit sensitive database information
- Follow the principle of least privilege for database access 
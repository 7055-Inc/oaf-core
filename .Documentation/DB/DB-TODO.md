# Database TODO List

This document outlines pending database tasks, improvements, and migration plans for the OAF application.

## High Priority

- [ ] Design and implement new authentication system
  - [ ] Create table(s) for JWT token management
  - [ ] Implement password hashing and security improvements
  - [ ] Add multi-factor authentication support

- [ ] Design and implement new session management
  - [ ] Create new `sessions` table with improved structure
  - [ ] Implement session timeout mechanisms
  - [ ] Add session invalidation capabilities

- [ ] Review and update foreign key constraints throughout the database
  - [ ] Ensure proper cascading rules are in place
  - [ ] Update any missing or incorrect constraints

## Medium Priority

- [ ] Optimize database schema
  - [ ] Review and optimize table indexes
  - [ ] Add missing indexes for frequently queried columns
  - [ ] Normalize tables where appropriate

- [ ] Improve data integrity
  - [ ] Add proper constraints and validation rules
  - [ ] Implement consistent NULL handling
  - [ ] Add default values where appropriate

- [ ] Create database migrations for schema changes
  - [ ] Document migration process
  - [ ] Ensure backward compatibility for critical updates

## Low Priority

- [ ] Archive old/unused data
  - [ ] Identify unused tables or columns
  - [ ] Create archiving strategy for historical data

- [ ] Database performance monitoring
  - [ ] Set up query monitoring
  - [ ] Identify and optimize slow queries

- [ ] Documentation improvements
  - [ ] Create complete ER diagrams
  - [ ] Document relationships between tables
  - [ ] Document business rules implemented in the database

## Notes

- Recent migration removed legacy authentication tables, which gives us an opportunity to redesign authentication from scratch.
- The `users` table remains intact but will need to be integrated with the new authentication system.
- Consider using UUIDs instead of auto-increment IDs for new tables. 
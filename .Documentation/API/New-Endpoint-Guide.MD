# API Endpoint Implementation Guide

This document provides a standardized approach for adding new endpoints to the Online Art Festival API based on the test endpoint implementation pattern.

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
4. [Code Templates](#code-templates)
5. [Error Handling Standards](#error-handling-standards)
6. [Testing Checklist](#testing-checklist)
7. [Security Considerations](#security-considerations)

## Overview

All API endpoints follow a consistent architecture:

- **Routes**: Define URL paths and HTTP methods
- **Controllers**: Handle request processing and response formatting
- **Services**: Execute business logic and database operations

The API uses a standard response format:

```json
// Success response
{
  "success": true,
  "data": { ... },
  "meta": { ... }  // Optional metadata (pagination, etc.)
}

// Error response
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

## Directory Structure

```
api-service/
├── config/                # Configuration files
├── src/
│   ├── server.js         # Main entry point
│   ├── routes/           # API routes
│   │   ├── test.js       # Test endpoint routes
│   │   └── [resource].js # Routes for each resource
│   ├── controllers/      # Request handlers
│   │   ├── testController.js
│   │   └── [resource]Controller.js
│   ├── middleware/       # Shared middleware
│   │   └── auth.js       # Authentication middleware
│   ├── services/         # Business logic
│   │   └── dbService.js  # Database communication service
│   └── utils/            # Helper functions
│       └── authUtils.js  # Authentication utilities
```

## Step-by-Step Implementation Guide

### 1. Create Route File

Create a new file in `src/routes/` named after your resource (e.g., `users.js`).

```javascript
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// GET /api/v1/resource - List resources
router.get('/', resourceController.listResources);

// GET /api/v1/resource/:id - Get single resource
router.get('/:id', resourceController.getResource);

// POST /api/v1/resource - Create resource
router.post('/', resourceController.createResource);

// PUT /api/v1/resource/:id - Update resource
router.put('/:id', resourceController.updateResource);

// DELETE /api/v1/resource/:id - Delete resource
router.delete('/:id', resourceController.deleteResource);

module.exports = router;
```

### 2. Create Controller File

Create a new file in `src/controllers/` named after your resource (e.g., `usersController.js`).

```javascript
const dbService = require('../services/dbService');

// List resources with pagination
exports.listResources = async (req, res, next) => {
  try {
    // Extract query parameters for filtering and pagination
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // Execute query using dbService
    const result = await dbService.executeQuery({
      operation: 'SELECT',
      body: {
        table: 'your_table_name',
        fields: ['id', 'field1', 'field2'], // List fields to return
        limit: limit,
        offset: offset,
        // Add conditions for filtering if needed
        conditions: req.query.filter ? { field: req.query.filter } : undefined
      }
    });
    
    // Format response
    res.json({
      success: true,
      data: result.items || [],
      meta: {
        pagination: {
          total: result.total || 0,
          page: page,
          limit: limit,
          pages: Math.ceil((result.total || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error(`Error listing resources:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to retrieve resources'
      }
    });
  }
};

// Get single resource by ID
exports.getResource = async (req, res, next) => {
  try {
    const id = req.params.id;
    
    const result = await dbService.executeQuery({
      operation: 'SELECT',
      body: {
        table: 'your_table_name',
        fields: ['id', 'field1', 'field2'], // List fields to return
        conditions: { id: id }
      }
    });
    
    // Check if resource exists
    if (!result || !result.item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'resource_not_found',
          message: 'Resource not found'
        }
      });
    }
    
    // Return the resource
    res.json({
      success: true,
      data: result.item
    });
  } catch (error) {
    console.error(`Error fetching resource:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to retrieve resource'
      }
    });
  }
};

// Create new resource
exports.createResource = async (req, res, next) => {
  try {
    // Validate input data (implement validation logic)
    
    const result = await dbService.executeQuery({
      operation: 'INSERT',
      body: {
        table: 'your_table_name',
        data: req.body
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        ...req.body
      }
    });
  } catch (error) {
    console.error(`Error creating resource:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to create resource'
      }
    });
  }
};

// Update existing resource
exports.updateResource = async (req, res, next) => {
  try {
    const id = req.params.id;
    
    // Validate input data (implement validation logic)
    
    const result = await dbService.executeQuery({
      operation: 'UPDATE',
      body: {
        table: 'your_table_name',
        data: req.body,
        conditions: { id: id }
      }
    });
    
    // Check if resource exists
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'resource_not_found',
          message: 'Resource not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        id: id,
        ...req.body
      }
    });
  } catch (error) {
    console.error(`Error updating resource:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to update resource'
      }
    });
  }
};

// Delete resource
exports.deleteResource = async (req, res, next) => {
  try {
    const id = req.params.id;
    
    const result = await dbService.executeQuery({
      operation: 'DELETE',
      body: {
        table: 'your_table_name',
        conditions: { id: id }
      }
    });
    
    // Check if resource exists
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'resource_not_found',
          message: 'Resource not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: { deleted: true, id: id }
    });
  } catch (error) {
    console.error(`Error deleting resource:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to delete resource'
      }
    });
  }
};
```

### 3. Register Routes in Server.js

Add your new route to `src/server.js`:

```javascript
// Add with the other requires at the top
const resourceRoutes = require('./routes/resource');

// Add with the other route registrations
app.use('/api/v1/resource', resourceRoutes);
```

## Code Templates

### Route Template

```javascript
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// Basic CRUD operations
router.get('/', resourceController.listResources);
router.get('/:id', resourceController.getResource);
router.post('/', resourceController.createResource);
router.put('/:id', resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);

// Additional custom operations
router.get('/:id/related', resourceController.getRelatedItems);
router.post('/:id/action', resourceController.performAction);

module.exports = router;
```

### Controller Function Template

```javascript
exports.functionName = async (req, res, next) => {
  try {
    // Extract parameters
    
    // Process request
    const result = await dbService.executeQuery({
      operation: '[OPERATION]', // SELECT, INSERT, UPDATE, DELETE
      body: {
        // Query parameters
      }
    });
    
    // Format and send response
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Error description]:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'error_code',
        message: 'Human-readable error message'
      }
    });
  }
};
```

### Database Query Templates

#### Select Query

```javascript
const result = await dbService.executeQuery({
  operation: 'SELECT',
  body: {
    table: 'table_name',
    fields: ['field1', 'field2', 'field3'],
    conditions: { field: value },
    joins: [
      {
        table: 'related_table',
        on: 'table_name.id = related_table.foreign_key',
        fields: ['related_field1', 'related_field2']
      }
    ],
    limit: 20,
    offset: 0,
    orderBy: [{ field: 'created_at', direction: 'DESC' }]
  }
});
```

#### Insert Query

```javascript
const result = await dbService.executeQuery({
  operation: 'INSERT',
  body: {
    table: 'table_name',
    data: {
      field1: value1,
      field2: value2
    }
  }
});
```

#### Update Query

```javascript
const result = await dbService.executeQuery({
  operation: 'UPDATE',
  body: {
    table: 'table_name',
    data: {
      field1: newValue1,
      field2: newValue2
    },
    conditions: { id: recordId }
  }
});
```

#### Delete Query

```javascript
const result = await dbService.executeQuery({
  operation: 'DELETE',
  body: {
    table: 'table_name',
    conditions: { id: recordId }
  }
});
```

## Error Handling Standards

Always use the standardized error response format:

```javascript
res.status(statusCode).json({
  success: false,
  error: {
    code: 'error_code',
    message: 'Human-readable error message',
    details: {} // Optional additional details
  }
});
```

### Common Error Codes and Status Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `validation_error` | 400 | Invalid input data |
| `authentication_error` | 401 | Authentication required |
| `permission_denied` | 403 | Insufficient permissions |
| `resource_not_found` | 404 | Resource does not exist |
| `duplicate_entry` | 409 | Resource already exists |
| `database_error` | 500 | Database operation failed |
| `server_error` | 500 | Unexpected server error |

### Validation Error Example

```javascript
res.status(400).json({
  success: false,
  error: {
    code: 'validation_error',
    message: 'Invalid input data',
    details: {
      fields: {
        email: 'Must be a valid email address',
        password: 'Must be at least 8 characters'
      }
    }
  }
});
```

## Testing Checklist

Before considering an endpoint complete, verify:

- [ ] Basic functionality works (all CRUD operations)
- [ ] Error handling works for all edge cases
- [ ] Response format follows API standards
- [ ] Pagination works correctly (if applicable)
- [ ] Filtering works correctly (if applicable)
- [ ] Authentication requirements are enforced (if applicable)
- [ ] Input validation is implemented

## Security Considerations

1. **Authentication**: For protected endpoints, add authentication middleware:

```javascript
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', resourceController.listPublicResources);

// Protected routes
router.post('/', authMiddleware, resourceController.createResource);
router.put('/:id', authMiddleware, resourceController.updateResource);
router.delete('/:id', authMiddleware, resourceController.deleteResource);
```

2. **Authorization**: Verify user permissions in controllers:

```javascript
exports.updateResource = async (req, res, next) => {
  try {
    // Check if user has permission
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'permission_denied',
          message: 'You do not have permission to update this resource'
        }
      });
    }
    
    // Continue with update logic...
  } catch (error) {
    // Error handling...
  }
};
```

3. **Input Validation**: Always validate and sanitize input data:

```javascript
// Example using a validation library
const { body, validationResult } = require('express-validator');

// Validation rules in routes
router.post('/', [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  // Additional validation rules...
], resourceController.createResource);

// Check validation in controller
exports.createResource = async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Invalid input data',
        details: { fields: errors.mapped() }
      }
    });
  }
  
  // Continue with resource creation...
};
``` 
# dashboard-widgets.js - Internal Documentation

## Overview
Comprehensive dashboard widget management system for the Beemeeart platform that provides customizable dashboard experiences with drag-and-drop functionality. This system handles widget layouts, shortcuts management, admin controls, and widget data endpoints. It supports both user-customizable widgets and admin-locked system widgets for announcements and system messages.

## Architecture
- **Type:** Route Layer (API Endpoints) - Dashboard Widget System
- **Dependencies:** express, database connection, JWT authentication, permissions middleware
- **Database Tables:**
  - `dashboard_layouts` - User widget layouts and configurations
  - `dashboard_widget_types` - Available widget types and metadata
  - `users` - User information for widget creation
- **External Services:** None (self-contained widget system)

## Widget System Architecture

### Widget Management Design
- **Layout System:** Grid-based widget positioning with drag-and-drop support
- **Widget Types:** Extensible widget type system with permission-based access
- **User Widgets:** User-customizable widgets that can be added, removed, and configured
- **Admin Widgets:** Admin-locked widgets for system announcements and messages
- **Auto-Creation:** Automatic creation of essential widgets (shortcuts) for new users
- **Configuration:** JSON-based widget configuration system

### Widget Categories
- **Productivity:** Shortcuts, quick actions, frequently used features
- **Store Management:** Product widgets, inventory displays, sales metrics
- **System:** Admin announcements, system messages, notifications
- **Analytics:** Performance metrics, usage statistics, reports

### Data Flow
1. **Layout Retrieval:** User requests dashboard layout with widgets
2. **Auto-Creation:** System ensures essential widgets exist
3. **Permission Check:** Validates user permissions for widget types
4. **Data Fetching:** Retrieves widget-specific data based on configuration
5. **Layout Updates:** Saves user layout changes while preserving admin widgets
6. **Widget Management:** Handles adding, removing, and configuring widgets

## Widget Layout Management

### GET /api/dashboard-widgets/layout
**Purpose:** Get user's dashboard layout with widgets and admin-locked widgets

**Authentication:** JWT token required

**Auto-Creation Features:**
- Automatically creates shortcuts widget if it doesn't exist
- Ensures products widget type is available for manual addition
- Sets up default widget configurations for new users

**Database Queries:**
```sql
-- Get user's customizable widgets
SELECT 
  dl.*,
  dwt.display_name,
  dwt.category,
  dwt.default_config
FROM dashboard_layouts dl
JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type
WHERE dl.user_id = ?
ORDER BY dl.grid_row ASC, dl.grid_col ASC

-- Get admin-locked widgets
SELECT 
  dl.*,
  dwt.display_name,
  dwt.category,
  dwt.default_config
FROM dashboard_layouts dl
JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type
WHERE dl.is_admin_locked = 1 AND dl.user_id = ?
ORDER BY dl.grid_row ASC, dl.grid_col ASC
```

**Response Structure:**
```json
{
  "success": true,
  "userLayout": [
    {
      "id": 1,
      "user_id": 123,
      "widget_type": "my_shortcuts",
      "grid_row": 0,
      "grid_col": 0,
      "widget_config": "{\"shortcuts\": [...]}",
      "is_admin_locked": 0,
      "display_name": "My Shortcuts",
      "category": "productivity",
      "default_config": "{\"shortcuts\": []}"
    }
  ],
  "adminLayout": [
    {
      "id": 2,
      "user_id": 123,
      "widget_type": "system_announcement",
      "grid_row": 0,
      "grid_col": 2,
      "widget_config": "{\"message\": \"System maintenance scheduled\"}",
      "is_admin_locked": 1,
      "display_name": "System Announcements",
      "category": "system"
    }
  ],
  "totalWidgets": 2
}
```

### POST /api/dashboard-widgets/layout
**Purpose:** Save user's dashboard layout with full grid positioning

**Authentication:** JWT token required

**Request Body:**
```json
{
  "layout": [
    {
      "widget_type": "my_shortcuts",
      "grid_row": 0,
      "grid_col": 0,
      "widget_config": {
        "shortcuts": [...]
      }
    },
    {
      "widget_type": "my_products",
      "grid_row": 0,
      "grid_col": 1
    }
  ]
}
```

**Layout Update Process:**
1. **Validation:** Ensures layout is an array
2. **Cleanup:** Removes existing user widgets (preserves admin-locked)
3. **Batch Insert:** Inserts new layout configuration
4. **Configuration:** Handles optional widget configurations

**Database Operations:**
```sql
-- Clear existing user layout
DELETE FROM dashboard_layouts 
WHERE user_id = ? AND is_admin_locked = 0

-- Insert new layout (batch operation)
INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked)
VALUES (?, ?, ?, ?, ?, 0), (?, ?, ?, ?, ?, 0), ...
```

### GET /api/dashboard-widgets/widget-types
**Purpose:** Get available widget types for user based on permissions

**Authentication:** JWT token required

**Permission-Based Filtering:**
```sql
SELECT * FROM dashboard_widget_types 
WHERE is_active = 1 
  AND (required_permission IS NULL OR required_permission IN (?))
ORDER BY category ASC, display_name ASC
```

**Response Structure:**
```json
{
  "success": true,
  "widget_types": {
    "productivity": [
      {
        "widget_type": "my_shortcuts",
        "display_name": "My Shortcuts",
        "description": "Quick access shortcuts to frequently used menu items",
        "category": "productivity",
        "is_active": 1,
        "required_permission": null,
        "default_config": "{\"shortcuts\": []}"
      }
    ],
    "store_management": [
      {
        "widget_type": "my_products",
        "display_name": "My Products",
        "description": "Display your recent products with quick access to manage them",
        "category": "store_management",
        "is_active": 1,
        "required_permission": null,
        "default_config": "{}"
      }
    ]
  }
}
```

## Widget Data Endpoints

### GET /api/dashboard-widgets/widget-data/:widgetType
**Purpose:** Get data for specific widget type with optional configuration

**Authentication:** JWT token required

**Parameters:**
- `widgetType` (path): Widget type identifier
- `config` (query): JSON configuration string (optional)

**Widget Type Routing:**
```javascript
switch (widgetType) {
  case 'my_shortcuts':
    data = await getShortcutsData(userId, widgetConfig);
    break;
  case 'my_products':
    // Delegates to /api/products/my endpoint
    data = { message: 'My Products widget fetches data directly from /api/products/my' };
    break;
  default:
    return res.status(400).json({ error: 'Unknown widget type' });
}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "shortcuts": [...],
    "maxShortcuts": 10,
    "canAddMore": true
  },
  "widget_type": "my_shortcuts"
}
```

## Shortcuts Widget Management

### Shortcuts Widget System
The shortcuts widget provides quick access to frequently used dashboard features and is automatically created for all users.

**Default Shortcuts:**
1. **Edit Profile** - Quick access to profile editing
2. **My Orders** - View order history and status
3. **Email Settings** - Manage email preferences

**Features:**
- Maximum 10 shortcuts per user
- Duplicate prevention
- Icon support (Font Awesome classes)
- Slide-in panel integration
- Persistent configuration storage

### POST /api/dashboard-widgets/shortcuts/add
**Purpose:** Add shortcut to user's shortcuts widget with validation

**Authentication:** JWT token required

**Request Body:**
```json
{
  "shortcut": {
    "id": "custom-reports",
    "label": "Custom Reports",
    "icon": "fas fa-chart-bar",
    "slideInType": "custom-reports"
  }
}
```

**Validation Rules:**
- Required fields: id, label, slideInType
- Duplicate prevention by shortcut ID
- Maximum 10 shortcuts limit
- Icon field optional (defaults to generic icon)

**Processing Steps:**
1. **Widget Retrieval:** Gets current shortcuts widget
2. **Validation:** Checks required fields and limits
3. **Duplicate Check:** Prevents duplicate shortcut IDs
4. **Configuration Update:** Adds shortcut to configuration
5. **Database Update:** Saves updated configuration

### POST /api/dashboard-widgets/shortcuts/remove
**Purpose:** Remove shortcut from user's shortcuts widget by ID

**Authentication:** JWT token required

**Request Body:**
```json
{
  "shortcutId": "custom-reports"
}
```

**Processing Steps:**
1. **Widget Retrieval:** Gets current shortcuts widget
2. **Validation:** Ensures shortcut ID is provided
3. **Filtering:** Removes shortcut from array
4. **Configuration Update:** Updates widget configuration
5. **Database Update:** Saves filtered shortcuts list

## Admin Widget Management

### POST /api/dashboard-widgets/admin/locked-widget
**Purpose:** Create locked widget for users (announcements, system messages, etc.)

**Authentication:** JWT token + system management permission required

**Request Body:**
```json
{
  "widget_type": "system_announcement",
  "grid_row": 0,
  "grid_col": 2,
  "widget_config": {
    "title": "System Maintenance",
    "message": "Scheduled maintenance on Sunday 2AM-4AM EST",
    "type": "warning",
    "dismissible": false
  },
  "target_users": [123, 456, 789]
}
```

**Target User Handling:**
- If `target_users` specified: Creates for specific users
- If `target_users` empty/null: Creates for all active users
- Batch creation for efficiency

**Database Operations:**
```sql
-- Get all active users if no target specified
SELECT id FROM users WHERE is_active = 1

-- Batch insert with upsert capability
INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked)
VALUES (?, ?, ?, ?, ?, 1), (?, ?, ?, ?, ?, 1), ...
ON DUPLICATE KEY UPDATE 
  widget_type = VALUES(widget_type),
  widget_config = VALUES(widget_config),
  is_admin_locked = 1
```

**Use Cases:**
- System announcements and maintenance notices
- Feature rollout notifications
- Policy updates and important messages
- Emergency notifications
- Promotional messages for specific user groups

## Widget Data Fetchers

### ensureShortcutsWidgetType()
**Purpose:** Ensure shortcuts widget type exists in database

**Widget Type Creation:**
```sql
INSERT INTO dashboard_widget_types (widget_type, display_name, description, category, is_active, default_config)
VALUES (?, ?, ?, ?, ?, ?)
```

**Configuration:**
- Widget Type: `my_shortcuts`
- Display Name: "My Shortcuts"
- Category: `productivity`
- Default Config: `{"shortcuts": []}`

### ensureProductsWidgetType()
**Purpose:** Ensure products widget type exists in database

**Configuration:**
- Widget Type: `my_products`
- Display Name: "My Products"
- Category: `store_management`
- Default Config: `{}`

### ensureShortcutsWidget(userId)
**Purpose:** Auto-create shortcuts widget for user if it doesn't exist

**Default Shortcuts Configuration:**
```json
{
  "shortcuts": [
    {
      "id": "edit-profile",
      "label": "Edit Profile",
      "icon": "fas fa-user-edit",
      "slideInType": "edit-profile"
    },
    {
      "id": "my-orders",
      "label": "My Orders",
      "icon": "fas fa-shopping-bag",
      "slideInType": "my-orders"
    },
    {
      "id": "email-settings",
      "label": "Email Settings",
      "icon": "fas fa-envelope-open-text",
      "slideInType": "email-settings"
    }
  ]
}
```

**Creation Process:**
1. **Type Validation:** Ensures shortcuts widget type exists
2. **Existence Check:** Checks if user already has shortcuts widget
3. **Widget Creation:** Creates widget with default shortcuts
4. **Grid Positioning:** Places at position (0,0) by default
5. **Error Handling:** Non-blocking operation (logs errors without throwing)

### getShortcutsData(userId, config)
**Purpose:** Get shortcuts widget data from database

**Data Retrieval:**
```sql
SELECT widget_config 
FROM dashboard_layouts 
WHERE user_id = ? AND widget_type = ?
```

**Response Structure:**
```json
{
  "shortcuts": [
    {
      "id": "edit-profile",
      "label": "Edit Profile",
      "icon": "fas fa-user-edit",
      "slideInType": "edit-profile"
    }
  ],
  "maxShortcuts": 10,
  "canAddMore": true
}
```

**Features:**
- Fresh data retrieval from database (ignores config parameter)
- Metadata about shortcuts capacity
- Availability status for adding more shortcuts
- Graceful error handling with default empty state

## Individual Widget Management

### POST /api/dashboard-widgets/add-widget
**Purpose:** Add a single widget to user's dashboard

**Authentication:** JWT token required

**Request Body:**
```json
{
  "widgetType": "my_products",
  "gridRow": 1,
  "gridCol": 0
}
```

**Database Operation:**
```sql
INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config)
VALUES (?, ?, ?, ?, ?)
```

**Features:**
- Simple widget addition without layout replacement
- Default empty configuration
- Grid positioning support
- Immediate widget availability

### POST /api/dashboard-widgets/remove-widget
**Purpose:** Remove a single widget from user's dashboard

**Authentication:** JWT token required

**Request Body:**
```json
{
  "widgetType": "my_products"
}
```

**Database Operation:**
```sql
DELETE FROM dashboard_layouts 
WHERE user_id = ? AND widget_type = ? AND is_admin_locked = 0
```

**Protection Features:**
- Only removes user widgets (preserves admin-locked widgets)
- Validates widget existence before removal
- Returns appropriate error if widget not found or protected
- Confirms successful removal with affected rows count

## Database Schema

### dashboard_layouts Table
```sql
CREATE TABLE dashboard_layouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  widget_type VARCHAR(50) NOT NULL,
  grid_row INT NOT NULL DEFAULT 0,
  grid_col INT NOT NULL DEFAULT 0,
  widget_config JSON,
  is_admin_locked BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_widget (user_id, widget_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### dashboard_widget_types Table
```sql
CREATE TABLE dashboard_widget_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  widget_type VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT 1,
  required_permission VARCHAR(50),
  default_config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Security Considerations

### Authentication and Authorization
- **JWT Authentication:** All endpoints require valid JWT token
- **Permission-Based Access:** Widget types can require specific permissions
- **Admin Controls:** System management permission required for admin widgets
- **User Isolation:** Users can only manage their own widgets

### Data Validation
- **Input Validation:** Comprehensive validation of all widget data
- **Configuration Validation:** JSON configuration validation
- **Grid Validation:** Grid position validation for layout consistency
- **Limit Enforcement:** Maximum shortcuts limit and other constraints

### Admin Widget Protection
- **Immutable Admin Widgets:** Users cannot remove or modify admin-locked widgets
- **Targeted Distribution:** Admin widgets can be targeted to specific users
- **Override Protection:** Admin widgets maintain their configuration
- **Audit Trail:** Admin widget creation tracked for accountability

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Proper indexing on user_id, widget_type, and is_admin_locked
- **Batch Operations:** Efficient batch inserts for layout updates and admin widgets
- **Query Optimization:** Optimized queries with appropriate JOINs
- **Connection Pooling:** Efficient database connection management

### Widget Loading
- **Lazy Loading:** Widget data loaded on-demand per widget type
- **Configuration Caching:** Widget configurations cached in database
- **Permission Caching:** User permissions cached for widget type filtering
- **Auto-Creation Optimization:** Efficient widget type and widget creation

### Layout Management
- **Grid Efficiency:** Efficient grid-based layout system
- **Bulk Updates:** Batch layout updates for better performance
- **Minimal Queries:** Optimized queries for layout retrieval
- **Configuration Storage:** JSON-based configuration for flexibility

## Error Handling

### Widget Management Errors
- **Widget Not Found:** Appropriate 404 responses for missing widgets
- **Permission Denied:** 403 responses for insufficient permissions
- **Validation Errors:** 400 responses with specific validation messages
- **System Errors:** 500 responses with generic error messages

### Shortcuts Management Errors
- **Duplicate Shortcuts:** Prevention and error messages for duplicates
- **Limit Exceeded:** Clear error messages for shortcuts limit
- **Invalid Configuration:** Validation of shortcut configuration data
- **Widget Missing:** Graceful handling of missing shortcuts widget

### Admin Widget Errors
- **Permission Validation:** Strict permission checking for admin operations
- **Target User Validation:** Validation of target user lists
- **Configuration Errors:** Validation of admin widget configurations
- **Batch Operation Errors:** Proper error handling for batch operations

## Monitoring and Analytics

### Widget Usage Tracking
- **Widget Creation:** Track widget creation and adoption rates
- **Layout Changes:** Monitor dashboard layout modification patterns
- **Shortcuts Usage:** Track shortcut usage and popularity
- **Admin Widget Effectiveness:** Monitor admin widget engagement

### Performance Monitoring
- **Query Performance:** Monitor database query performance
- **Layout Load Times:** Track dashboard layout loading performance
- **Widget Data Fetching:** Monitor widget data retrieval times
- **Batch Operation Performance:** Track batch operation efficiency

### User Experience Metrics
- **Dashboard Engagement:** Track user dashboard interaction patterns
- **Widget Preferences:** Monitor popular widget types and configurations
- **Customization Patterns:** Analyze dashboard customization trends
- **Error Rates:** Monitor error rates and user experience issues

## Integration Points

### Frontend Integration
- **Drag-and-Drop:** Integration with frontend drag-and-drop libraries
- **Real-time Updates:** WebSocket integration for real-time widget updates
- **Responsive Design:** Support for responsive dashboard layouts
- **Widget Components:** Standardized widget component architecture

### Permission System Integration
- **Role-Based Access:** Integration with platform permission system
- **Dynamic Permissions:** Support for dynamic permission-based widget access
- **Admin Controls:** Integration with admin management system
- **User Management:** Coordination with user management system

### Data Integration
- **Product Integration:** Integration with product management system
- **Order Integration:** Integration with order management system
- **Analytics Integration:** Integration with analytics and reporting systems
- **Notification Integration:** Integration with notification system

## Future Enhancements

### Advanced Widget Features
- **Widget Themes:** Customizable widget themes and styling
- **Widget Sizing:** Variable widget sizes and responsive layouts
- **Widget Groups:** Grouping and categorization of related widgets
- **Widget Templates:** Pre-configured widget templates for different user types

### Enhanced Customization
- **Custom Widgets:** User-created custom widgets
- **Widget Marketplace:** Marketplace for third-party widgets
- **Advanced Layouts:** More sophisticated layout options
- **Widget Sharing:** Sharing widget configurations between users

### Analytics and Insights
- **Widget Analytics:** Detailed analytics for widget usage and performance
- **User Behavior Tracking:** Advanced user behavior analytics
- **Predictive Widgets:** AI-powered widget recommendations
- **Performance Insights:** Detailed performance insights and optimization

## Testing and Validation

### Unit Testing
- **Widget CRUD Operations:** Test all widget creation, reading, updating, deletion
- **Shortcuts Management:** Test shortcuts addition, removal, and validation
- **Admin Widget Management:** Test admin widget creation and distribution
- **Permission Validation:** Test permission-based access control

### Integration Testing
- **Dashboard Layout:** Test complete dashboard layout functionality
- **Widget Data Fetching:** Test widget data retrieval and processing
- **User Experience:** Test complete user dashboard experience
- **Admin Workflows:** Test admin widget management workflows

### Performance Testing
- **Load Testing:** Test dashboard performance under load
- **Concurrent Users:** Test concurrent dashboard access
- **Large Datasets:** Test performance with large numbers of widgets
- **Batch Operations:** Test batch operation performance

## Deployment Considerations

### Database Setup
- **Schema Creation:** Ensure proper database schema setup
- **Index Creation:** Create necessary database indexes
- **Data Migration:** Handle migration of existing dashboard data
- **Backup Procedures:** Implement backup procedures for widget data

### Configuration Management
- **Widget Type Setup:** Configure initial widget types
- **Permission Setup:** Configure widget permissions
- **Default Configurations:** Set up default widget configurations
- **Admin Widget Templates:** Prepare admin widget templates

### Monitoring Setup
- **Performance Monitoring:** Set up dashboard performance monitoring
- **Error Tracking:** Implement error tracking and alerting
- **Usage Analytics:** Set up widget usage analytics
- **Health Checks:** Implement dashboard system health checks

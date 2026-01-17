# Dashboard Widgets API

## Overview
The Beemeeart Dashboard Widgets API provides a comprehensive system for managing customizable dashboard experiences. This API enables users to create personalized dashboards with drag-and-drop widgets, shortcuts management, and admin-controlled system widgets. The system supports grid-based layouts, permission-based widget access, and extensible widget types.

## Authentication
All endpoints require JWT authentication. Include your JWT token in the Authorization header.

## Base URL
```
https://api.beemeeart.com/dashboard-widgets
```

## Widget System Architecture

The dashboard widget system consists of:
- **User Widgets:** Customizable widgets that users can add, remove, and configure
- **Admin Widgets:** System-controlled widgets for announcements and important messages
- **Widget Types:** Extensible widget type system with permission-based access
- **Grid Layout:** Flexible grid-based positioning system
- **Shortcuts:** Quick access shortcuts to frequently used features

## Widget Layout Management

### Get Dashboard Layout
`GET /api/dashboard-widgets/layout`

Retrieves the user's complete dashboard layout including both user-customizable and admin-locked widgets. Automatically creates essential widgets (like shortcuts) if they don't exist.

**Authentication:** JWT token required

**Response (200 OK):**
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

**Features:**
- Auto-creates shortcuts widget for new users
- Separates user and admin widgets for proper handling
- Includes widget metadata and configuration
- Provides total widget count for layout planning

### Save Dashboard Layout
`POST /api/dashboard-widgets/layout`

Saves the user's complete dashboard layout with grid positioning. This replaces the entire user layout while preserving admin-locked widgets.

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
        "shortcuts": [
          {
            "id": "edit-profile",
            "label": "Edit Profile",
            "icon": "fas fa-user-edit",
            "slideInType": "edit-profile"
          }
        ]
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

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard layout saved"
}
```

**Layout Configuration:**
- `widget_type`: Widget type identifier (required)
- `grid_row`: Row position in grid (required)
- `grid_col`: Column position in grid (required)
- `widget_config`: Optional widget-specific configuration

### Get Available Widget Types
`GET /api/dashboard-widgets/widget-types`

Retrieves available widget types for the user based on their permissions, organized by category.

**Authentication:** JWT token required

**Response (200 OK):**
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

**Widget Categories:**
- `productivity`: Shortcuts, quick actions, frequently used features
- `store_management`: Product widgets, inventory displays, sales metrics
- `system`: Admin announcements, system messages, notifications
- `analytics`: Performance metrics, usage statistics, reports

## Widget Data Endpoints

### Get Widget Data
`GET /api/dashboard-widgets/widget-data/:widgetType`

Retrieves data for a specific widget type with optional configuration parameters.

**Authentication:** JWT token required

**Path Parameters:**
- `widgetType`: Widget type identifier

**Query Parameters:**
- `config` (optional): JSON configuration string

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
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
  },
  "widget_type": "my_shortcuts"
}
```

**Supported Widget Types:**
- `my_shortcuts`: Returns shortcuts data with metadata
- `my_products`: Delegates to `/api/products/my` endpoint

## Shortcuts Widget Management

The shortcuts widget provides quick access to frequently used dashboard features and is automatically created for all users.

### Add Shortcut
`POST /api/dashboard-widgets/shortcuts/add`

Adds a new shortcut to the user's shortcuts widget with validation and duplicate prevention.

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

**Response (200 OK):**
```json
{
  "success": true,
  "shortcuts": [
    {
      "id": "edit-profile",
      "label": "Edit Profile",
      "icon": "fas fa-user-edit",
      "slideInType": "edit-profile"
    },
    {
      "id": "custom-reports",
      "label": "Custom Reports",
      "icon": "fas fa-chart-bar",
      "slideInType": "custom-reports"
    }
  ],
  "message": "Shortcut added successfully"
}
```

**Shortcut Configuration:**
- `id` (required): Unique shortcut identifier
- `label` (required): Display label for the shortcut
- `icon` (optional): Font Awesome icon class
- `slideInType` (required): Slide-in panel type identifier

**Validation Rules:**
- Maximum 10 shortcuts per user
- Duplicate IDs not allowed
- Required fields must be provided
- Icon field is optional (defaults to generic icon)

### Remove Shortcut
`POST /api/dashboard-widgets/shortcuts/remove`

Removes a shortcut from the user's shortcuts widget by ID.

**Authentication:** JWT token required

**Request Body:**
```json
{
  "shortcutId": "custom-reports"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "shortcuts": [
    {
      "id": "edit-profile",
      "label": "Edit Profile",
      "icon": "fas fa-user-edit",
      "slideInType": "edit-profile"
    }
  ],
  "message": "Shortcut removed successfully"
}
```

## Individual Widget Management

### Add Single Widget
`POST /api/dashboard-widgets/add-widget`

Adds a single widget to the user's dashboard with grid positioning.

**Authentication:** JWT token required

**Request Body:**
```json
{
  "widgetType": "my_products",
  "gridRow": 1,
  "gridCol": 0
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Parameters:**
- `widgetType`: Widget type to add
- `gridRow`: Grid row position
- `gridCol`: Grid column position

### Remove Single Widget
`POST /api/dashboard-widgets/remove-widget`

Removes a single widget from the user's dashboard. Only removes user widgets; admin-locked widgets are preserved.

**Authentication:** JWT token required

**Request Body:**
```json
{
  "widgetType": "my_products"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Widget removed successfully"
}
```

## Admin Widget Management

### Create Locked Widget
`POST /api/dashboard-widgets/admin/locked-widget`

**Admin Only:** Creates admin-locked widgets for users (announcements, system messages, etc.). Requires system management permissions.

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

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Locked widget created for 3 users",
  "affected_users": 3
}
```

**Configuration:**
- `widget_type`: Widget type to create
- `grid_row`: Grid row position
- `grid_col`: Grid column position
- `widget_config`: Widget-specific configuration
- `target_users`: Specific user IDs (optional, defaults to all users)

**Use Cases:**
- System announcements and maintenance notices
- Feature rollout notifications
- Policy updates and important messages
- Emergency notifications
- Promotional messages for specific user groups

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (invalid input, missing required fields)
- `401` - Unauthorized (invalid or missing JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (widget not found)
- `500` - Internal Server Error (system error)

### Widget-Specific Errors
- **Layout Errors:** "Layout must be an array"
- **Shortcut Errors:** "Maximum shortcuts limit reached", "Shortcut already exists"
- **Widget Errors:** "Unknown widget type", "Widget not found or cannot be removed"
- **Permission Errors:** "Insufficient permissions for admin operations"

## Integration Examples

### Complete Dashboard Implementation
```javascript
// Dashboard widget management class
class DashboardManager {
  constructor(apiBaseUrl, authToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = authToken;
    this.headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Load dashboard layout
  async loadDashboard() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/layout`, {
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.renderDashboard(data.userLayout, data.adminLayout);
        return data;
      } else {
        throw new Error('Failed to load dashboard');
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      throw error;
    }
  }
  
  // Save dashboard layout
  async saveDashboard(layout) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/layout`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ layout })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Dashboard saved successfully');
        return data;
      } else {
        throw new Error(data.error || 'Failed to save dashboard');
      }
    } catch (error) {
      console.error('Dashboard save error:', error);
      throw error;
    }
  }
  
  // Get available widget types
  async getAvailableWidgets() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/widget-types`, {
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.widget_types;
      } else {
        throw new Error('Failed to load widget types');
      }
    } catch (error) {
      console.error('Widget types load error:', error);
      throw error;
    }
  }
  
  // Get widget data
  async getWidgetData(widgetType, config = null) {
    try {
      let url = `${this.apiBaseUrl}/dashboard-widgets/widget-data/${widgetType}`;
      if (config) {
        url += `?config=${encodeURIComponent(JSON.stringify(config))}`;
      }
      
      const response = await fetch(url, {
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to load widget data');
      }
    } catch (error) {
      console.error('Widget data load error:', error);
      throw error;
    }
  }
  
  // Add widget to dashboard
  async addWidget(widgetType, gridRow, gridCol) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/add-widget`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          widgetType,
          gridRow,
          gridCol
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Widget ${widgetType} added successfully`);
        return data;
      } else {
        throw new Error(data.error || 'Failed to add widget');
      }
    } catch (error) {
      console.error('Widget add error:', error);
      throw error;
    }
  }
  
  // Remove widget from dashboard
  async removeWidget(widgetType) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/remove-widget`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ widgetType })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Widget ${widgetType} removed successfully`);
        return data;
      } else {
        throw new Error(data.error || 'Failed to remove widget');
      }
    } catch (error) {
      console.error('Widget remove error:', error);
      throw error;
    }
  }
  
  // Render dashboard UI
  renderDashboard(userWidgets, adminWidgets) {
    const dashboardContainer = document.getElementById('dashboard-container');
    dashboardContainer.innerHTML = '';
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'dashboard-grid';
    
    // Render user widgets
    userWidgets.forEach(widget => {
      const widgetElement = this.createWidgetElement(widget, false);
      gridContainer.appendChild(widgetElement);
    });
    
    // Render admin widgets
    adminWidgets.forEach(widget => {
      const widgetElement = this.createWidgetElement(widget, true);
      gridContainer.appendChild(widgetElement);
    });
    
    dashboardContainer.appendChild(gridContainer);
  }
  
  // Create widget element
  createWidgetElement(widget, isAdminLocked) {
    const widgetElement = document.createElement('div');
    widgetElement.className = `dashboard-widget ${isAdminLocked ? 'admin-locked' : 'user-widget'}`;
    widgetElement.style.gridRow = widget.grid_row + 1;
    widgetElement.style.gridColumn = widget.grid_col + 1;
    widgetElement.dataset.widgetType = widget.widget_type;
    
    // Widget header
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
      <h3>${widget.display_name}</h3>
      ${!isAdminLocked ? '<button class="widget-remove" onclick="this.removeWidget()">×</button>' : ''}
    `;
    
    // Widget content
    const content = document.createElement('div');
    content.className = 'widget-content';
    content.id = `widget-${widget.widget_type}-${widget.user_id}`;
    
    widgetElement.appendChild(header);
    widgetElement.appendChild(content);
    
    // Load widget data
    this.loadWidgetContent(widget, content);
    
    return widgetElement;
  }
  
  // Load widget content
  async loadWidgetContent(widget, contentElement) {
    try {
      const config = widget.widget_config ? JSON.parse(widget.widget_config) : {};
      const data = await this.getWidgetData(widget.widget_type, config);
      
      // Render widget-specific content
      switch (widget.widget_type) {
        case 'my_shortcuts':
          this.renderShortcutsWidget(data, contentElement);
          break;
        case 'my_products':
          this.renderProductsWidget(data, contentElement);
          break;
        default:
          contentElement.innerHTML = '<p>Widget content not implemented</p>';
      }
    } catch (error) {
      console.error(`Failed to load content for ${widget.widget_type}:`, error);
      contentElement.innerHTML = '<p>Failed to load widget content</p>';
    }
  }
  
  // Render shortcuts widget
  renderShortcutsWidget(data, contentElement) {
    const shortcutsContainer = document.createElement('div');
    shortcutsContainer.className = 'shortcuts-container';
    
    data.shortcuts.forEach(shortcut => {
      const shortcutElement = document.createElement('button');
      shortcutElement.className = 'shortcut-button';
      shortcutElement.innerHTML = `
        <i class="${shortcut.icon}"></i>
        <span>${shortcut.label}</span>
      `;
      shortcutElement.onclick = () => this.handleShortcutClick(shortcut);
      
      shortcutsContainer.appendChild(shortcutElement);
    });
    
    // Add shortcut button if can add more
    if (data.canAddMore) {
      const addButton = document.createElement('button');
      addButton.className = 'shortcut-button add-shortcut';
      addButton.innerHTML = '<i class="fas fa-plus"></i><span>Add Shortcut</span>';
      addButton.onclick = () => this.showAddShortcutDialog();
      
      shortcutsContainer.appendChild(addButton);
    }
    
    contentElement.appendChild(shortcutsContainer);
  }
  
  // Handle shortcut click
  handleShortcutClick(shortcut) {
    console.log(`Shortcut clicked: ${shortcut.id}`);
    // Implement shortcut action based on slideInType
    switch (shortcut.slideInType) {
      case 'edit-profile':
        this.openEditProfile();
        break;
      case 'my-orders':
        this.openMyOrders();
        break;
      case 'email-settings':
        this.openEmailSettings();
        break;
      default:
        console.log(`Unknown shortcut type: ${shortcut.slideInType}`);
    }
  }
}

// Initialize dashboard
const dashboard = new DashboardManager('https://api.beemeeart.com', userToken);
dashboard.loadDashboard();
```

### Shortcuts Management
```javascript
// Shortcuts management class
class ShortcutsManager {
  constructor(apiBaseUrl, authToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Add shortcut
  async addShortcut(shortcut) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/shortcuts/add`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ shortcut })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Shortcut added successfully');
        return data.shortcuts;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Add shortcut error:', error);
      throw error;
    }
  }
  
  // Remove shortcut
  async removeShortcut(shortcutId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard-widgets/shortcuts/remove`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ shortcutId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Shortcut removed successfully');
        return data.shortcuts;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Remove shortcut error:', error);
      throw error;
    }
  }
  
  // Show add shortcut dialog
  showAddShortcutDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'shortcut-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Add Shortcut</h3>
        <form id="add-shortcut-form">
          <div class="form-group">
            <label for="shortcut-id">ID:</label>
            <input type="text" id="shortcut-id" required>
          </div>
          <div class="form-group">
            <label for="shortcut-label">Label:</label>
            <input type="text" id="shortcut-label" required>
          </div>
          <div class="form-group">
            <label for="shortcut-icon">Icon (Font Awesome class):</label>
            <input type="text" id="shortcut-icon" placeholder="fas fa-star">
          </div>
          <div class="form-group">
            <label for="shortcut-type">Type:</label>
            <select id="shortcut-type" required>
              <option value="edit-profile">Edit Profile</option>
              <option value="my-orders">My Orders</option>
              <option value="email-settings">Email Settings</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit">Add Shortcut</button>
            <button type="button" onclick="this.closeDialog()">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Handle form submission
    document.getElementById('add-shortcut-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const shortcut = {
        id: document.getElementById('shortcut-id').value,
        label: document.getElementById('shortcut-label').value,
        icon: document.getElementById('shortcut-icon').value || 'fas fa-star',
        slideInType: document.getElementById('shortcut-type').value
      };
      
      try {
        await this.addShortcut(shortcut);
        this.closeDialog();
        // Reload dashboard or update shortcuts widget
        window.location.reload();
      } catch (error) {
        alert(`Failed to add shortcut: ${error.message}`);
      }
    });
  }
  
  closeDialog() {
    const dialog = document.querySelector('.shortcut-dialog');
    if (dialog) {
      dialog.remove();
    }
  }
}
```

## Rate Limits and Performance

### API Rate Limits
- Standard rate limits apply to all endpoints
- No specific rate limits for dashboard operations
- Batch operations recommended for layout updates

### Performance Considerations
- Dashboard layouts cached on client side
- Widget data loaded on-demand
- Efficient grid-based layout system
- Optimized database queries with proper indexing

### Best Practices
- Load widget data asynchronously
- Cache widget configurations locally
- Use batch layout updates when possible
- Implement proper error handling and retry logic

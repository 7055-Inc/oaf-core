# 🎛️ Dashboard Widget System Documentation

## 📋 **Overview**

The Dashboard Widget System provides a flexible, drag-and-drop dashboard interface where users can customize their workspace with various widgets. The system supports both user-controlled widgets and admin-managed widgets, with a robust grid-based layout system and dynamic widget loading.

## ✅ **Implemented Features**

### **Grid-Based Layout System**
- **6-Column Grid**: Responsive grid system with 6 columns and unlimited rows
- **Drag & Drop**: Users can drag widgets to reposition them within the grid
- **Auto-Save**: Layout changes are automatically saved to the database
- **Responsive Design**: Grid adapts to different screen sizes
- **Visual Feedback**: Drop zones and drag indicators for better UX

### **Widget Management**
- **Dynamic Loading**: Widgets are loaded dynamically based on database configuration
- **Two-Tier System**: User-controlled widgets and admin-locked widgets
- **Auto-Expansion**: Widgets can automatically span multiple grid columns
- **Widget Types**: Extensible system supporting multiple widget types
- **Configuration Storage**: Widget-specific configuration stored as JSON

### **User Experience**
- **Welcome Header**: Personalized welcome message for all users
- **Empty State**: Helpful overlay when users have no widgets installed
- **Loading States**: Smooth loading indicators during widget operations
- **Error Handling**: Graceful error handling with user-friendly messages
- **Real-time Updates**: Widgets update in real-time without page refresh

## 🏗️ **Technical Implementation**

### **Database Schema**

```sql
-- Widget type definitions
CREATE TABLE dashboard_widget_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  widget_type VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  required_permission VARCHAR(50),
  default_config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User widget layouts
CREATE TABLE dashboard_layouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  widget_type VARCHAR(50) NOT NULL,
  grid_row INT NOT NULL,
  grid_col INT NOT NULL,
  widget_config JSON,
  is_admin_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (widget_type) REFERENCES dashboard_widget_types(widget_type),
  UNIQUE KEY unique_position (user_id, grid_row, grid_col)
);
```

### **Frontend Architecture**

#### **Core Components**
- **`DashboardGrid.js`**: Main grid container with drag-and-drop functionality
- **`WidgetRenderer.js`**: Dynamic widget loader and data fetcher
- **`widgets/`**: Individual widget components directory

#### **Component Hierarchy**
```
Dashboard (pages/dashboard/index.js)
├── DashboardGrid
│   ├── WidgetRenderer (for each widget)
│   │   ├── ShortcutsWidget
│   │   ├── [Other Widget Types]
│   │   └── Widget-specific components
│   └── Grid cells and drag-and-drop handlers
└── Slide-in panels and other UI components
```

### **Backend API Endpoints**

#### **Layout Management**
- **`GET /api/dashboard-widgets/layout`**: Fetch user's dashboard layout
- **`POST /api/dashboard-widgets/layout`**: Save user's dashboard layout
- **`GET /api/dashboard-widgets/widget-types`**: Get available widget types

#### **Widget Data**
- **`GET /api/dashboard-widgets/widget-data/{type}`**: Fetch data for specific widget type

#### **Widget-Specific Endpoints**
- **`POST /api/dashboard-widgets/shortcuts/add`**: Add shortcut to shortcuts widget
- **`POST /api/dashboard-widgets/shortcuts/remove`**: Remove shortcut from shortcuts widget

### **Widget Development Pattern**

#### **1. Database Setup**
```sql
-- Add widget type to registry
INSERT INTO dashboard_widget_types (
  widget_type, display_name, description, category, default_config
) VALUES (
  'my_widget', 'My Widget', 'Description of widget', 'productivity', '{}'
);
```

#### **2. Backend Data Handler**
```javascript
// In dashboard-widgets.js
async function getMyWidgetData(userId, config) {
  try {
    // Fetch widget-specific data
    const data = await fetchWidgetData(userId, config);
    return data;
  } catch (err) {
    console.error('Error fetching widget data:', err);
    return { error: 'Failed to load data' };
  }
}

// Add to switch statement in widget-data endpoint
case 'my_widget':
  data = await getMyWidgetData(userId, widgetConfig);
  break;
```

#### **3. Frontend Widget Component**
```javascript
// widgets/MyWidget.js
import React, { useState, useEffect } from 'react';
import styles from './my-widget/my-widget.module.css';

export default function MyWidget({ data, config, onConfigChange }) {
  const [widgetState, setWidgetState] = useState(null);

  useEffect(() => {
    if (data) {
      setWidgetState(data);
      
      // Calculate grid span if needed
      const gridSpan = calculateGridSpan(data);
      if (onConfigChange) {
        onConfigChange({ ...config, gridSpan });
      }
    }
  }, [data]); // Note: Don't include onConfigChange in deps to avoid loops

  return (
    <div className={styles.myWidget}>
      {/* Widget content */}
    </div>
  );
}
```

#### **4. Register in WidgetRenderer**
```javascript
// WidgetRenderer.js
import MyWidget from './widgets/MyWidget';

// Add to switch statement
case 'my_widget':
  return (
    <MyWidget 
      data={data} 
      config={config} 
      onConfigChange={onConfigChange}
    />
  );
```

## 🎯 **Shortcuts Widget**

### **Overview**
The Shortcuts Widget is the flagship widget of the dashboard system, providing users with quick access to frequently used menu items. It's automatically created for all users and serves as a productivity enhancement tool.

### **Features**
- **Auto-Creation**: Automatically created for all new users with default shortcuts
- **Pre-Populated**: Comes with "Edit Profile", "My Orders", and "Email Settings"
- **Dynamic Sizing**: Auto-expands horizontally based on number of shortcuts (2-6 columns)
- **Add/Remove**: Users can add shortcuts via '+' buttons in menu, remove via '-' buttons
- **Slide-in Integration**: Shortcuts open the same slide-in panels as menu items
- **Maximum Limit**: Limited to 10 shortcuts to prevent UI overflow
- **Hide When Empty**: Widget is hidden if user removes all shortcuts

### **Technical Details**

#### **Database Configuration**
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

#### **Grid Span Calculation**
```javascript
const gridSpan = Math.min(Math.max(2, Math.ceil(shortcutCount / 2)), 6);
```
- **Minimum**: 2 columns (even with 1-2 shortcuts)
- **Maximum**: 6 columns (full width)
- **Calculation**: Ceil(shortcuts / 2) to arrange in rows of 2

#### **Integration Points**
- **Menu Integration**: `MyAccountMenu.js` has '+' buttons that call shortcuts API
- **Event System**: Uses custom events for cross-component communication
  - `dashboard-open-slide-in`: Opens slide-in panels
  - `shortcuts-updated`: Notifies menu to refresh state
- **API Endpoints**: Dedicated endpoints for adding/removing shortcuts

### **User Workflow**
1. **First Visit**: Widget auto-created with 3 default shortcuts
2. **Adding Shortcuts**: Click '+' button next to menu items
3. **Using Shortcuts**: Click shortcut to open corresponding slide-in panel
4. **Removing Shortcuts**: Click '-' button on shortcut in widget
5. **Widget Hiding**: Widget disappears if all shortcuts are removed

### **Styling**
- **CSS Modules**: Uses `shortcuts.module.css` for component-scoped styles
- **Responsive Design**: Adapts to different screen sizes
- **Icon Support**: FontAwesome icons with customizable colors
- **Hover Effects**: Interactive feedback for better UX
- **Loading States**: Visual feedback during add/remove operations

## 🔧 **Development Guidelines**

### **Widget Development Best Practices**

1. **Avoid Infinite Loops**: Never include `onConfigChange` in `useEffect` dependencies
2. **Error Handling**: Always provide fallback states and error messages
3. **Loading States**: Show loading indicators for async operations
4. **CSS Modules**: Use CSS Modules for component-scoped styling
5. **Grid Span**: Calculate and communicate grid span requirements to parent
6. **Data Validation**: Validate widget data and configuration on both frontend and backend

### **Performance Considerations**

1. **Lazy Loading**: Widgets are loaded only when needed
2. **Data Caching**: Widget data is cached to reduce API calls
3. **Efficient Updates**: Only re-render when data actually changes
4. **Memory Management**: Clean up event listeners and subscriptions

### **Security Guidelines**

1. **Input Validation**: Validate all widget configuration and user input
2. **Permission Checks**: Verify user permissions for widget operations
3. **CSRF Protection**: Use authenticated API requests for all operations
4. **XSS Prevention**: Sanitize any user-generated content in widgets

## 🚀 **Future Enhancements**

### **Planned Features**
- **Widget Marketplace**: Allow third-party widget development
- **Widget Sharing**: Share widget configurations between users
- **Advanced Layouts**: Support for widget resizing and complex layouts
- **Widget Categories**: Organize widgets by category in selection interface
- **Widget Analytics**: Track widget usage and performance metrics

### **Technical Improvements**
- **Real-time Sync**: WebSocket-based real-time widget updates
- **Offline Support**: Cache widget data for offline functionality
- **Performance Monitoring**: Track widget load times and errors
- **A/B Testing**: Framework for testing widget variations

## 📝 **Troubleshooting**

### **Common Issues**

#### **Infinite Loops**
- **Symptom**: Excessive API calls, 429 rate limit errors
- **Cause**: `onConfigChange` in `useEffect` dependencies
- **Solution**: Remove `onConfigChange` from dependency array

#### **Widget Not Loading**
- **Symptom**: Widget shows loading state indefinitely
- **Cause**: API endpoint error or missing widget type registration
- **Solution**: Check API logs and verify widget type in database

#### **Layout Not Saving**
- **Symptom**: Widget positions reset on page refresh
- **Cause**: Database transaction errors or permission issues
- **Solution**: Check API logs for save errors, verify user permissions

#### **Widget Data Not Updating**
- **Symptom**: Widget shows stale data after changes
- **Cause**: Caching issues or missing data refresh
- **Solution**: Implement proper cache invalidation and data refresh logic

### **Debug Tools**
- **Browser DevTools**: Monitor network requests and console errors
- **PM2 Logs**: Check backend API logs for server-side errors
- **Database Queries**: Verify widget configuration and layout data
- **React DevTools**: Inspect component state and props

## 📚 **Related Documentation**
- [Authentication System](./AUTHENTICATION_SYSTEM_README.md)
- [Permissions System](./PERMISSIONS_SYSTEM_README.md)
- [Complete System Overview](./COMPLETE_SYSTEM_OVERVIEW.md)

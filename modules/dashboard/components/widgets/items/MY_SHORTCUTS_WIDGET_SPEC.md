# Dashboard Widget System - Project Specification

## 📋 Project Overview
Building a comprehensive dashboard widget system with two core widgets: "My Shortcuts" (auto-created) and "My Products" (user-addable) - establishing the foundation for a scalable widget ecosystem.

## 🎯 Widget Specifications

# My Shortcuts Widget

### Basic Properties
- **Widget Type**: `my_shortcuts`
- **Position**: Top-left corner (0,0) - auto-created widget
- **Size**: 6 cells wide (fixed horizontal span)
- **Maximum**: 10 shortcuts total (prevents screen takeover)
- **Default State**: Auto-created for ALL users with 3 pre-populated shortcuts
- **User Control**: Users can add/remove individual shortcuts

### Default Shortcuts (Pre-populated)
1. **Edit Profile** 
   - Menu Path: My Account > Edit Profile
   - Icon: `fas fa-user-edit`
   - Action: Opens edit-profile slide-in panel

2. **My Orders**
   - Menu Path: My Account > My Orders  
   - Icon: `fas fa-shopping-bag`
   - Action: Opens my-orders slide-in panel

3. **Email Settings**
   - Menu Path: My Account > Email Settings
   - Icon: `fas fa-envelope-open-text`
   - Action: Opens email-settings slide-in panel

# My Products Widget

### Basic Properties
- **Widget Type**: `my_products`
- **Position**: User-defined (addable via '+' button)
- **Size**: 3 cells wide (fixed horizontal span)
- **Default State**: Not auto-created - user must add manually
- **User Control**: Users can add/remove entire widget
- **Data Source**: `/products/my?limit=5&include=images` API endpoint

### Widget Features
1. **Product Display**
   - Shows 5 most recently added products
   - Product image (first image from product.images array)
   - Product title and price
   - Grid layout for clean presentation

2. **Widget Actions**
   - **Refresh Button**: Reload product data
   - **Remove Button**: Delete widget from dashboard (red 'X')
   - **See More Button**: Opens full "My Products" slide-in panel

3. **Add Widget Integration**
   - **Menu Path**: Manage My Store > My Products
   - **Add Button**: '+' icon next to "My Products" menu item
   - **Duplicate Prevention**: Cannot add multiple products widgets
   - **Position Logic**: Automatically places at next available row

### Data Structure
- **API Response**: 
  ```json
  {
    "products": [
      {
        "id": 123,
        "title": "Product Name",
        "price": "29.99",
        "images": ["/path/to/image1.jpg", "/path/to/image2.jpg"]
      }
    ]
  }
  ```

## 🔧 Technical Architecture

### Widget Component Structure
```
components/dashboard/widgets/
├── ShortcutsWidget.js             # My Shortcuts widget component
├── MyProductsWidget.js            # My Products widget component
├── shortcuts/                     # Shortcuts widget folder
│   ├── shortcuts code files       # Widget-specific components
│   └── shortcuts.module.css       # Widget-specific styles (CSS Module)
├── my-products/                   # Products widget folder
│   └── my-products.module.css     # Widget-specific styles (CSS Module)
└── MY_SHORTCUTS_WIDGET_SPEC.md    # This specification document
```

### State Management
- **Storage**: Widget config JSON in database (`dashboard_layouts.widget_config`)
- **Structure**: 
  ```json
  {
    "shortcuts": [
      {
        "id": "edit-profile",
        "label": "Edit Profile",
        "icon": "fas fa-user-edit",
        "slideInType": "edit-profile"
      }
    ]
  }
  ```

### Database Integration
- **Auto-creation**: Shortcuts widget automatically created for all users on first dashboard load
- **API Endpoints**: 
  - GET `/api/dashboard-widgets/layout` - Load dashboard layout
  - POST `/api/dashboard-widgets/layout` - Save layout changes
  - GET `/api/dashboard-widgets/widget-data/my_shortcuts` - Load shortcuts data
  - POST `/api/dashboard-widgets/shortcuts/add` - Add shortcut
  - POST `/api/dashboard-widgets/shortcuts/remove` - Remove shortcut
  - POST `/api/dashboard-widgets/add-widget` - Add new widget
  - POST `/api/dashboard-widgets/remove-widget` - Remove widget
  - GET `/products/my?limit=5&include=images` - Load products data

## 🎨 UI/UX Design

### Widget Layout
- **Grid Layout**: Horizontal row of shortcuts
- **Shortcut Design**: Icon above label, with remove button
- **Responsive**: Adapts to different screen sizes
- **Empty State**: Widget hidden when no shortcuts exist

### Shortcut Button Design
```
┌─────────────┐
│      ×      │  ← Remove button (top-right)
│   [ICON]    │  ← FontAwesome icon
│   Label     │  ← Text label below
└─────────────┘
```

### Menu Integration
- **Add '+' buttons** to menu items on the right side
- **Real-time updates**: Click '+' → shortcut appears instantly
- **Dynamic state**: '+' button hidden when shortcut already exists

## 🚀 Implementation Phases

### Phase 1: Backend Foundation
- [ ] Create widget auto-creation logic
- [ ] Implement shortcut management in existing API
- [ ] Add default shortcuts seeding

### Phase 2: Widget Component
- [ ] Create `MyShortcutsWidget.js` component
- [ ] Implement add/remove shortcut functionality
- [ ] Add responsive grid layout
- [ ] Style with `MyShortcutsWidget.module.css`

### Phase 3: Menu Integration
- [ ] Modify `MyAccountMenu.js` to add '+' buttons
- [ ] Implement real-time state checking
- [ ] Add API calls for shortcut management

### Phase 4: Integration & Testing
- [ ] Update `WidgetRenderer.js` to include new widget
- [ ] Test auto-creation for new users
- [ ] Test add/remove functionality
- [ ] Mobile responsiveness testing

## 📁 Files Created/Modified

### New Widget Files
- `components/dashboard/widgets/ShortcutsWidget.js` - My Shortcuts widget component
- `components/dashboard/widgets/MyProductsWidget.js` - My Products widget component
- `components/dashboard/widgets/shortcuts/shortcuts.module.css` - Shortcuts styles
- `components/dashboard/widgets/my-products/my-products.module.css` - Products styles

### Modified Core Files
- `components/dashboard/WidgetRenderer.js` - Added both widget cases
- `components/dashboard/DashboardGrid.js` - Updated for self-contained widgets
- `components/dashboard/my-account/MyAccountMenu.js` - Added '+' buttons for shortcuts
- `components/dashboard/manage-my-store/ManageMyStoreMenu.js` - Added '+' button for products
- `api-service/src/routes/dashboard-widgets.js` - Added all widget management logic
- `api-service/src/routes/products.js` - Added limit parameter support

## 🎯 Success Criteria

### My Shortcuts Widget - Functional Requirements
- [x] Widget auto-created for all users
- [x] 3 default shortcuts pre-populated
- [x] Shortcuts open correct slide-in panels
- [x] '+' buttons add shortcuts in real-time
- [x] '-' buttons remove shortcuts
- [x] Maximum 10 shortcuts enforced
- [x] 6 cells wide horizontal layout

### My Products Widget - Functional Requirements
- [x] Widget addable via '+' button in menu
- [x] Shows 5 most recent products with images
- [x] Displays product titles and prices
- [x] "See More" button opens products slide-in
- [x] Refresh functionality works
- [x] Remove widget functionality (red 'X')
- [x] Prevents duplicate widgets
- [x] 3 cells wide layout

### Technical Requirements
- [x] Self-contained widget architecture
- [x] Dynamic grid spanning system
- [x] Clean API endpoint design
- [x] Proper error handling and loading states
- [x] Database consistency and transactions
- [x] Responsive design
- [x] CSS Modules for scoped styling

## 🔮 Future Enhancements

### My Shortcuts Widget
- Additional shortcut options from other menu sections
- Drag-and-drop reordering within widget
- Custom shortcut creation
- Shortcut categories/grouping
- Export/import shortcut configurations

### My Products Widget
- Product filtering and search within widget
- Different view modes (list vs grid)
- Product status indicators (draft, active, etc.)
- Quick edit functionality
- Product performance metrics

### System-Wide Enhancements
- More widget types (My Orders, Analytics, Notifications)
- Widget marketplace/library
- Custom widget creation tools
- Widget themes and customization
- Mobile-optimized widget layouts

## 📝 Notes
- **Architecture Foundation**: Established self-contained widget pattern for scalability
- **Grid System**: Dynamic spanning allows widgets to control their own layout
- **API Design**: Clean, RESTful endpoints for widget management
- **Database Design**: Flexible JSON config storage for widget customization
- **User Experience**: Intuitive add/remove functionality with duplicate prevention
- **Code Quality**: CSS Modules, proper error handling, and loading states

## 🏆 Project Status

### Completed Features ✅
- **My Shortcuts Widget**: Fully functional with auto-creation and management
- **My Products Widget**: Complete with add/remove and product display
- **Core Architecture**: Self-contained widgets with dynamic grid spanning
- **API Endpoints**: Full CRUD operations for widget management
- **Database Integration**: Proper schema with constraint handling
- **User Interface**: Clean, responsive design with proper UX patterns

---


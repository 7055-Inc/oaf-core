# Dashboard Module

## Overview

The Dashboard module is a **frontend-only** module that provides the new dashboard UI. It replaces the current slidein-based dashboard with a page-based navigation system.

**This is an ongoing module** - components are added as each backend module is refactored.

## Current Status

### Layout Components (✅ Complete)
- ✅ `DashboardShell.js` - Main wrapper (sidebar + header + content + footer)
- ✅ `DashboardHeader.js` - Uses global `button.secondary`, existing `Breadcrumb` component
- ✅ `DashboardFooter.js` - Added policy/help links
- ✅ `Sidebar.js` - Collapsible navigation container
- ✅ `SidebarMenu.js` - Config-driven, permission-based menu

### Widget System (✅ Migrated)
- ✅ `WidgetGrid.js` (renamed from DashboardGrid)
- ✅ `WidgetRenderer.js`
- ✅ Widget items → `components/widgets/items/`

### Styles (✅ Global-first)
- ✅ `dashboard.css` - Layout styles (imported in `_app.js`)
- ✅ Header/Sidebar/Menu use global CSS classes
- ⏳ Footer still uses module.css (to be converted)

### Config
- ✅ `config/menuConfig.js` - Permission-based menu structure

### Wrappers (backward compatibility)
Old imports still work via wrappers at:
- `components/dashboard/DashboardHeader.js`
- `components/dashboard/DashboardFooter.js`
- `components/dashboard/DashboardGrid.js`
- `components/dashboard/WidgetRenderer.js`

### Next Steps
1. **Wire DashboardShell** to dashboard index page
2. **Users Section** - First module-specific section:
   - ProfileView.js - View own profile
   - ProfileEdit.js - Edit own profile
   - EmailPreferences.js - Email settings
   - PaymentSettings.js - Payment methods
   - ShippingSettings.js - Shipping addresses
   - OrderHistory.js - Order history
   - PersonaManager.js - Manage personas (vendor only)
   - admin/UserList.js - Admin user management
   - admin/PermissionManager.js - Admin permission management
3. **Shared components** - PageHeader, FormPanel, DataTable, etc.
4. **Convert footer to global styles**

---

## Design Principles

1. **Pages, not slideins** - Each section loads as a full page in the content area
2. **Persistent navigation** - Sidebar menu stays visible, can collapse
3. **Real URLs** - Every view has a URL (`/dashboard/users/edit/123`)
4. **Reusable components** - Form components can be used in modals elsewhere on site
5. **Module-based menu** - Menu structure mirrors backend module structure

---

## Navigation Structure

```
/dashboard                    → Widget area (index)
/dashboard/users              → Users section index
/dashboard/users/edit/:id     → Edit user page
/dashboard/catalog            → Catalog section index
/dashboard/catalog/products   → Products list
/dashboard/catalog/products/:id/edit → Edit product
/dashboard/commerce           → Commerce section index
/dashboard/commerce/orders    → Orders list
... etc
```

---

## File Structure

```
modules/dashboard/
├── components/
│   ├── layout/               # Dashboard shell components
│   │   ├── DashboardShell.js # Main wrapper (sidebar + content area)
│   │   ├── Sidebar.js        # Collapsible navigation menu
│   │   ├── SidebarMenu.js    # Menu with nested items
│   │   └── ContentArea.js    # Page content wrapper
│   │
│   ├── shared/               # Dashboard-specific reusable components
│   │   ├── DataTable/        # Sortable, filterable tables
│   │   ├── StatCard/         # Stat display cards
│   │   ├── PageHeader/       # Page title + actions
│   │   ├── FormPanel/        # Form container (replaces slideins)
│   │   └── ActionBar/        # Bulk action toolbar
│   │
│   ├── users/                # User management components
│   │   ├── UserList.js
│   │   ├── UserForm.js
│   │   ├── ProfileEditor.js
│   │   └── ...
│   │
│   ├── catalog/              # Product management components
│   │   ├── ProductList.js
│   │   ├── ProductForm.js
│   │   └── ...
│   │
│   ├── commerce/             # Order management components
│   │   └── ...
│   │
│   ├── events/               # Event management components
│   │   └── ...
│   │
│   ├── websites/             # Site management components
│   │   └── ...
│   │
│   └── admin/                # Admin-only components
│       └── ...
│
├── hooks/                    # Dashboard-specific hooks
│   ├── useDataTable.js       # Table state management
│   └── useDashboardNav.js    # Navigation helpers
│
├── styles/                   # Dashboard styles
│   ├── dashboard.css         # Core dashboard styles
│   └── variables.css         # Dashboard-specific CSS variables
│
└── README.md                 # This file
```

---

## Menu Structure

Menu mirrors module hierarchy:

```
Dashboard (home/widgets)
│
├── Users
│   ├── My Profile
│   ├── Edit Profile
│   ├── My Personas (vendor only)
│   ├── Email Preferences
│   ├── Payment Settings
│   ├── Shipping Addresses
│   ├── Order History
│   ├── User Management (admin)
│   └── Permissions (admin)
│
├── Catalog
│   ├── My Products
│   ├── Add Product
│   ├── Categories
│   └── Inventory
│
├── Commerce
│   ├── Orders
│   ├── Returns
│   └── Financials
│
├── Events
│   ├── My Events
│   ├── Applications
│   └── Calendar
│
├── Websites
│   ├── My Site
│   ├── Customize
│   └── Domain
│
└── Admin (admin-only)
    ├── User Management
    ├── Reports
    └── System
```

---

## Migration Strategy

### Phase 1: Layout Shell ✅ Complete
- [x] Create `DashboardShell.js` with sidebar + content area
- [x] Create `Sidebar.js` with collapsible navigation
- [x] Create `SidebarMenu.js` with config-driven menu
- [x] Create `DashboardHeader.js` with breadcrumbs
- [x] Create `DashboardFooter.js` with policy links
- [x] Keep existing widget grid on `/dashboard` index

### Phase 2: Users Section 🔄 Next
- [ ] Wire DashboardShell to dashboard index page
- [ ] Create `/dashboard/users/profile` page
- [ ] Create `/dashboard/users/profile/edit` page
- [ ] Create `/dashboard/users/personas` page
- [ ] Create `/dashboard/users/email` page
- [ ] Create `/dashboard/users/payments` page
- [ ] Create `/dashboard/users/shipping` page
- [ ] Create `/dashboard/users/orders` page
- [ ] Create `/dashboard/users/admin` page (admin)
- [ ] Create `/dashboard/users/admin/permissions` page (admin)
- [ ] Update menuConfig.js with Users section

### Phase 3+: Other Sections
- [ ] Catalog section (with Catalog module)
- [ ] Commerce section (with Commerce module)
- [ ] Events section (with Events module)
- [ ] Websites section (with Websites module)
- [ ] Admin section (with Admin module)

### Final: Cleanup
- [ ] Remove old slidein components
- [ ] Remove old menu items
- [ ] Clean up unused CSS
- [ ] Delete wrapper files

---

## Component Reuse Pattern

Dashboard components are built to be reusable:

```jsx
// On dashboard page
<DashboardPage>
  <PageHeader title="Edit Product" />
  <ProductForm productId={123} />
</DashboardPage>

// In a modal elsewhere on site
<Modal>
  <ProductForm productId={123} onSave={closeModal} />
</Modal>

// Inline quick-edit
<QuickEditPanel>
  <ProductForm productId={123} compact />
</QuickEditPanel>
```

---

## Integration with Backend Modules

Each backend module refactor triggers dashboard work:

| Backend Module | Dashboard Section |
|----------------|-------------------|
| Auth (done) | - (auth is behind-the-scenes) |
| Users | `components/users/` |
| Catalog | `components/catalog/` |
| Commerce | `components/commerce/` |
| Events | `components/events/` |
| Websites | `components/websites/` |
| Admin | `components/admin/` |

---

## Existing Widget System

The widget grid system is **kept as-is**:
- Lives on `/dashboard` index page
- Drag-and-drop 6-column grid
- Stored in database (`dashboard_layouts` table)
- Widgets render via `WidgetRenderer.js`

New pages load in place of widget area when navigating away.
Click "Dashboard" in menu → returns to widget area.

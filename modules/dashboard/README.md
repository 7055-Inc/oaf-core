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

### Users Section (✅ Complete)
- ✅ ProfileForm (accordion-based editor with sections)
- ✅ EmailPreferences
- ✅ PaymentSettings
- ✅ ShippingSettings
- ✅ PersonaList / PersonaForm
- ✅ UserManagement (admin)
- ✅ PersonaManagement (admin)
- ✅ VerificationHub

### Shared Components (✅ Added)
- ✅ AccordionSection (moved from components/shared)

### Next Steps
1. **Catalog Section** - Product management components
2. **Commerce Section** - Order management (MyOrders)
3. **Convert footer to global styles**

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
│   ├── index.js              # Component exports
│   │
│   ├── layout/               # Dashboard shell components
│   │   ├── index.js
│   │   ├── DashboardShell.js # Main wrapper (sidebar + header + content + footer)
│   │   ├── DashboardHeader.js
│   │   ├── DashboardFooter.js
│   │   ├── Sidebar.js        # Collapsible navigation container
│   │   └── SidebarMenu.js    # Config-driven, permission-based menu
│   │
│   ├── shared/               # Dashboard-specific reusable components
│   │   ├── index.js
│   │   └── AccordionSection.js # Collapsible form sections
│   │
│   ├── users/                # User management components ✅
│   │   ├── index.js
│   │   ├── EmailPreferences.js
│   │   ├── PaymentSettings.js
│   │   ├── ShippingSettings.js
│   │   ├── PersonaList.js
│   │   ├── PersonaForm.js
│   │   ├── UserManagement.js    # Admin
│   │   ├── PersonaManagement.js # Admin
│   │   ├── VerificationHub.js
│   │   └── profile-form/        # Accordion-based profile editor
│   │       ├── index.js
│   │       ├── ProfileFormContext.js
│   │       ├── data/
│   │       │   ├── artistOptions.js
│   │       │   └── communityOptions.js
│   │       └── sections/
│   │           ├── index.js
│   │           ├── PersonalInfoSection.js
│   │           ├── AddressSection.js
│   │           ├── SocialMediaSection.js
│   │           ├── ProfileImagesSection.js
│   │           ├── AdditionalInfoSection.js
│   │           ├── ArtistProfileSection.js
│   │           ├── PromoterProfileSection.js
│   │           └── CommunityPreferencesSection.js
│   │
│   ├── widgets/              # Widget system (migrated)
│   │   ├── index.js
│   │   ├── WidgetGrid.js
│   │   ├── WidgetRenderer.js
│   │   └── items/
│   │
│   ├── catalog/              # Product management (pending)
│   ├── commerce/             # Order management (pending)
│   ├── events/               # Event management (pending)
│   └── websites/             # Site management (pending)
│
├── config/
│   ├── index.js
│   └── menuConfig.js         # Permission-based menu structure
│
├── styles/
│   └── dashboard.css         # Dashboard layout styles
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

### Phase 2: Users Section ✅ Complete
- [x] Wire DashboardShell to dashboard pages
- [x] Create `/dashboard/users/profile` page
- [x] Create `/dashboard/users/profile/edit` page (accordion ProfileForm)
- [x] Create `/dashboard/users/personas/*` pages
- [x] Create `/dashboard/users/email` page
- [x] Create `/dashboard/users/payments` page
- [x] Create `/dashboard/users/shipping` page
- [x] Create `/dashboard/users/manage` page (admin)
- [x] Create `/dashboard/users/personas/manage/*` pages (admin)
- [x] Create `/dashboard/users/verification` page
- [x] Update menuConfig.js with Users section
- [x] Add user-type color coding to menu
- [x] Delete old slide-in components

### Phase 3: Catalog Section 🔄 Next
- [ ] Move AccordionSection wrapper (product-form still uses old path)
- [ ] Catalog section components
- [ ] Product form migration to modular location
- [ ] Commerce section (MyOrders)

### Phase 4+: Other Sections
- [ ] Events section (with Events module)
- [ ] Websites section (with Websites module)
- [ ] Admin section (global admin tools)

### Final: Cleanup
- [ ] Remove remaining wrapper files
- [ ] Clean up unused CSS
- [ ] Delete legacy routes after wrapper period

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

/**
 * Dashboard Menu Configuration
 * 
 * Each menu section can have:
 * - id: unique identifier for collapse state
 * - label: display text
 * - href: optional link for the header itself
 * - permission: required permission (checked via hasPermission)
 * - permissions: array of permissions (user needs ANY of these)
 * - userTypes: array of user types that can see this (e.g., ['admin', 'artist'])
 * - adminOnly: shortcut for userTypes: ['admin']
 * - items: array of sub-items with same permission options
 * 
 * Permission logic:
 * - If no permission/userTypes specified, item is visible to all logged-in users
 * - adminOnly users see everything regardless of other permissions
 */

const menuConfig = [
  {
    id: 'dashboard-home',
    label: 'Dashboard',
    href: '/dashboard',
    exact: true, // Only highlight when exactly on /dashboard
  },
  {
    id: 'users',
    label: 'Users',
    href: '/dashboard/users',
    items: [
      { 
        label: 'My Profile', 
        href: '/dashboard/users/profile' 
      },
      { 
        label: 'My Personas', 
        href: '/dashboard/users/personas',
        permission: 'personas'
      },
      { 
        label: 'Verification', 
        href: '/dashboard/users/verification' 
      },
      { 
        label: 'User Management', 
        href: '/dashboard/users/manage', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog',
    href: '/dashboard/catalog',
    permissions: ['vendor', 'sites'], // Need either permission
    items: [
      { 
        label: 'My Products', 
        href: '/dashboard/catalog/products' 
      },
      { 
        label: 'Add Product', 
        href: '/dashboard/catalog/products/new' 
      },
      { 
        label: 'Upload/Download', 
        href: '/dashboard/catalog/import-export' 
      },
      { 
        label: 'Collections', 
        href: '/dashboard/catalog/collections' 
      },
      { 
        label: 'All Products', 
        href: '/dashboard/catalog/admin', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'commerce',
    label: 'Commerce',
    href: '/dashboard/commerce',
    items: [
      { 
        label: 'My Orders', 
        href: '/dashboard/commerce/orders' 
      },
      { 
        label: 'My Sales', 
        href: '/dashboard/commerce/sales',
        permissions: ['vendor', 'sites']
      },
      { 
        label: 'Shipping', 
        href: '/dashboard/commerce/shipping',
        permissions: ['vendor', 'sites']
      },
      { 
        label: 'Returns', 
        href: '/dashboard/commerce/returns',
        permissions: ['vendor', 'sites']
      },
      { 
        label: 'All Orders', 
        href: '/dashboard/commerce/admin', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'finances',
    label: 'Finances',
    href: '/dashboard/finances',
    permission: 'stripe_connect',
    items: [
      { 
        label: 'Transaction History', 
        href: '/dashboard/finances/transactions' 
      },
      { 
        label: 'Payouts & Earnings', 
        href: '/dashboard/finances/payouts' 
      },
    ]
  },
  {
    id: 'events',
    label: 'Events',
    href: '/dashboard/events',
    userTypes: ['admin', 'artist', 'promoter'],
    items: [
      { 
        label: 'My Events', 
        href: '/dashboard/events/mine' 
      },
      { 
        label: 'Create Event', 
        href: '/dashboard/events/new',
        userTypes: ['admin', 'promoter']
      },
      { 
        label: 'All Events', 
        href: '/dashboard/events/admin', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'websites',
    label: 'Websites',
    href: '/dashboard/websites',
    permission: 'sites',
    items: [
      { 
        label: 'My Sites', 
        href: '/dashboard/websites/mine' 
      },
      { 
        label: 'Site Settings', 
        href: '/dashboard/websites/settings' 
      },
      { 
        label: 'All Sites', 
        href: '/dashboard/websites/admin', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    href: '/dashboard/subscriptions',
    userTypes: ['admin', 'artist', 'promoter'],
    items: [
      { 
        label: 'My Plan', 
        href: '/dashboard/subscriptions/plan' 
      },
      { 
        label: 'Add-ons', 
        href: '/dashboard/subscriptions/addons' 
      },
      { 
        label: 'Billing History', 
        href: '/dashboard/subscriptions/billing' 
      },
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    href: '/dashboard/admin',
    adminOnly: true,
    items: [
      { 
        label: 'Applications', 
        href: '/dashboard/admin/applications' 
      },
      { 
        label: 'Support Tickets', 
        href: '/dashboard/admin/tickets' 
      },
      { 
        label: 'System Settings', 
        href: '/dashboard/admin/settings',
        permission: 'manage_system'
      },
      { 
        label: 'Content Management', 
        href: '/dashboard/admin/content' 
      },
      { 
        label: 'Developers', 
        href: '/dashboard/admin/developers' 
      },
    ]
  },
];

export default menuConfig;

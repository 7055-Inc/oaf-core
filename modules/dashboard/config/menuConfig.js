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
 * 
 * Styling:
 * - Menu items are color-coded by user type visibility
 * - This helps admins see which items are for which user types
 */

/**
 * User-type based menu link colors
 * - Items visible to everyone: no special color (inherit)
 * - Admin only: green
 * - Artist only: purple (#3e1c56)
 * - Promoter only: orange
 * - Admins see ALL items but with their target user-type color
 */
export const menuStyleColors = {
  adminOnly: '#198754',      // Green - admin-only items
  artist: '#3e1c56',         // Purple - artist items (admins see purple too)
  promoter: '#fd7e14',       // Orange - promoter items (admins see orange too)
  default: 'inherit',        // No special color - visible to everyone
};

const menuConfig = [
  {
    id: 'dashboard-home',
    label: 'Dashboard',
    href: '/dashboard',
    exact: true, // Only highlight when exactly on /dashboard
  },
  {
    id: 'users',
    label: 'My Account',
    href: '/dashboard/users',
    items: [
      { 
        label: 'My Profile', 
        href: '/dashboard/users/profile' 
      },
      { 
        label: 'Edit Profile', 
        href: '/dashboard/users/profile/edit' 
      },
      { 
        label: 'Artist Personas', 
        href: '/dashboard/users/personas',
        userTypes: ['artist']
      },
      { 
        label: 'Email Preferences', 
        href: '/dashboard/users/email' 
      },
      { 
        label: 'Payment Settings', 
        href: '/dashboard/users/payments' 
      },
      { 
        label: 'Shipping Settings', 
        href: '/dashboard/users/shipping' 
      },
      { 
        label: 'Verification', 
        href: '/dashboard/users/verification',
        userTypes: ['artist']
      },
      // Admin-only user management items
      { 
        label: 'Manage Users', 
        href: '/dashboard/users/manage',
        adminOnly: true 
      },
      { 
        label: 'All Personas', 
        href: '/dashboard/users/personas/manage',
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
];

export default menuConfig;

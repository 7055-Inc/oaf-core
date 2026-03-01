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
    icon: 'fa-home',
    exact: true, // Only highlight when exactly on /dashboard
  },
  {
    id: 'users',
    label: 'My Account',
    href: '/dashboard/users',
    icon: 'fa-user',
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
        href: '/dashboard/users/payments',
        permission: 'stripe_connect'
      },
      { 
        label: 'Shipping Settings', 
        href: '/dashboard/users/shipping',
        permissions: ['shipping', 'vendor']
      },
      { 
        href: '/dashboard/users/verified',
        userTypes: ['admin', 'artist'],
        // Conditional label based on verified permission
        labelCondition: {
          permission: 'verified',
          hasPermission: 'Verified Status',
          noPermission: 'Get Verified'
        }
      },
      // Admin-only user management items
      { 
        label: 'Manage Users', 
        href: '/dashboard/users/manage',
        adminOnly: true 
      },
      { 
        label: 'Act As...', 
        href: '/dashboard/users/manage?action=impersonate',
        adminOnly: true 
      },
      { 
        label: 'All Personas', 
        href: '/dashboard/users/personas/manage',
        adminOnly: true 
      },
      { 
        label: 'Manage Commissions', 
        href: '/dashboard/users/commissions',
        adminOnly: true 
      },
      { 
        label: 'API Keys', 
        href: '/dashboard/users/api-keys',
        adminOnly: true 
      },
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog',
    href: '/dashboard/catalog',
    icon: 'fa-box',
    userTypes: ['artist', 'admin'],
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
        label: 'Manage Inventory', 
        href: '/dashboard/catalog/inventory' 
      },
      { 
        label: 'Inventory Log', 
        href: '/dashboard/catalog/inventory/log' 
      },
      {
        label: 'Sales Channels',
        items: [
          { label: 'Marketplace', href: '/dashboard/commerce/marketplace' },
          { label: 'Artist Website', href: '/dashboard/websites/subscription' },
          { label: 'Walmart Connector', href: '/dashboard/catalog/addons/walmart' },
          { label: 'Walmart Connector Admin', href: '/dashboard/catalog/addons/walmart-admin', adminOnly: true },
          { label: 'Wayfair Connector', href: '/dashboard/catalog/addons/wayfair' },
          { label: 'Wayfair Connector Admin', href: '/dashboard/catalog/addons/wayfair-admin', adminOnly: true },
          { label: 'TikTok Connector', href: '/dashboard/catalog/addons/tiktok' },
          { label: 'TikTok Connector Admin', href: '/dashboard/catalog/addons/tiktok-admin', adminOnly: true },
        ]
      },
      { 
        label: 'All Products', 
        href: '/dashboard/catalog/admin', 
        adminOnly: true 
      },
      { 
        label: 'Categories', 
        href: '/dashboard/catalog/categories', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'commerce',
    label: 'Business Center',
    href: '/dashboard/commerce',
    icon: 'fa-briefcase',
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
        href: '/dashboard/commerce/shipping-labels',
        permissions: ['vendor', 'sites']
      },
      { 
        label: 'Returns', 
        href: '/dashboard/commerce/returns',
        permissions: ['vendor', 'sites']
      },
      { 
        href: '/dashboard/commerce/marketplace',
        userTypes: ['admin', 'artist'],
        // Conditional label based on marketplace permission
        labelCondition: {
          permission: 'marketplace',
          hasPermission: 'Marketplace Settings',
          noPermission: 'Join the Marketplace'
        }
      },
      { 
        label: 'Payouts & Earnings', 
        href: '/dashboard/commerce/finances',
        permission: 'stripe_connect'
      },
      { 
        label: 'Transactions', 
        href: '/dashboard/commerce/finances/transactions',
        permission: 'stripe_connect'
      },
      { 
        label: 'All Orders', 
        href: '/dashboard/commerce/all-orders', 
        adminOnly: true 
      },
      { 
        label: 'Marketplace Applications', 
        href: '/dashboard/commerce/marketplace-applications', 
        adminOnly: true 
      },
      { 
        label: 'All Event Applications', 
        href: '/dashboard/commerce/all-applications', 
        adminOnly: true 
      },
      { 
        label: 'Returns Admin', 
        href: '/dashboard/commerce/returns-admin', 
        adminOnly: true 
      },
      { 
        label: 'My Applicants', 
        href: '/dashboard/commerce/applicants',
        userTypes: ['admin', 'promoter']
      },
    ]
  },
  {
    id: 'communications',
    label: 'Communications',
    href: '/dashboard/communications',
    icon: 'fa-comments',
    items: [
      { 
        label: 'Help Center', 
        href: 'https://staging.brakebee.com/help',
        external: true
      },
      { 
        label: 'My Tickets', 
        href: '/dashboard/communications/tickets' 
      },
      { 
        label: 'All Tickets', 
        href: '/dashboard/communications/admin', 
        adminOnly: true,
        notificationKey: 'open_tickets'
      },
      { 
        label: 'Articles & Blogs', 
        href: '/dashboard/communications/articles',
        permission: 'sites'
      },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    href: '/dashboard/marketing',
    icon: 'fa-bullhorn',
    items: [
      { 
        label: 'Share Content', 
        href: '/dashboard/marketing/share-content'
      },
      { 
        label: 'User Media Library', 
        href: '/dashboard/marketing/media-library',
        adminOnly: true
      },
      { 
        label: 'Promotions', 
        href: '/dashboard/marketing/promotions',
        permissions: ['vendor', 'sites']
      },
      { 
        label: 'Admin Promotions', 
        href: '/dashboard/marketing/admin-promotions',
        adminOnly: true
      },
      { 
        label: 'Cold-Call Promoters', 
        href: '/dashboard/marketing/cold-call-promoters',
        adminOnly: true
      },
    ]
  },
  {
    id: 'crm',
    label: 'CRM',
    href: '/dashboard/crm',
    icon: 'fa-envelope',
    permission: 'crm',
    items: [
      { 
        label: 'Subscribers', 
        href: '/dashboard/crm' 
      },
      { 
        label: 'Forms', 
        href: '/dashboard/crm/forms' 
      },
      { 
        label: 'Send Campaign', 
        href: '/dashboard/crm/send-campaign' 
      },
      { 
        label: 'Analytics', 
        href: '/dashboard/crm/analytics' 
      },
    ]
  },
  {
    id: 'events',
    label: 'Events',
    href: '/dashboard/events',
    icon: 'fa-calendar',
    userTypes: ['admin', 'artist', 'promoter'],
    items: [
      { 
        label: 'My Events', 
        href: '/dashboard/events/mine',
        userTypes: ['admin', 'promoter']
      },
      { 
        label: 'Events I Own', 
        href: '/dashboard/events/own',
        userTypes: ['admin', 'promoter']
      },
      { 
        label: 'My Applications', 
        href: '/dashboard/events/applications',
        userTypes: ['admin', 'artist']
      },
      { 
        label: 'Find New', 
        href: '/dashboard/events/find',
        userTypes: ['admin', 'artist']
      },
      { 
        label: 'Jury Packets', 
        href: '/dashboard/events/jury-packets',
        userTypes: ['admin', 'artist']
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
      { 
        label: 'Solicit Promoter', 
        href: '/dashboard/events/solicit-promoter', 
        adminOnly: true 
      },
      { 
        label: 'Unclaimed Events', 
        href: '/dashboard/events/unclaimed', 
        adminOnly: true 
      },
    ]
  },
  {
    id: 'service',
    label: 'Service',
    href: '/dashboard/service',
    icon: 'fa-cog',
    adminOnly: true,
    items: [
      {
        label: 'Admin Event Review',
        href: '/dashboard/service/event-reviews',
        adminOnly: true
      },
      {
        label: 'Refunds',
        href: '/dashboard/service/refunds',
        adminOnly: true
      },
    ]
  },
  {
    id: 'websites',
    label: 'Websites',
    href: '/dashboard/websites',
    icon: 'fa-globe',
    permission: 'sites',
    items: [
      { 
        label: 'My Sites', 
        href: '/dashboard/websites/mine' 
      },
      { 
        label: 'Payment Settings', 
        href: '/dashboard/websites/payments' 
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
    icon: 'fa-credit-card',
    userTypes: ['admin', 'artist', 'promoter'],
    items: [
      { 
        label: 'Manage', 
        href: '/dashboard/subscriptions' 
      },
    ]
  },
  {
    id: 'system',
    label: 'System',
    href: '/dashboard/system',
    icon: 'fa-cogs',
    adminOnly: true,
    items: [
      { 
        label: 'Curate', 
        href: '/dashboard/system/curate',
        adminOnly: true,
        notificationKey: 'unsorted_products'
      },
      { 
        label: 'Homepage', 
        href: '/dashboard/system/homepage',
        adminOnly: true
      },
      { 
        label: 'Email Management', 
        href: '/dashboard/system/email',
        adminOnly: true
      },
      { 
        label: 'Terms & Policies', 
        href: '/dashboard/system/terms',
        adminOnly: true
      },
      { 
        label: 'Data Retention', 
        href: '/dashboard/system/data-retention',
        adminOnly: true
      },
      { 
        label: 'Secrets Manager', 
        href: '/dashboard/system/secrets',
        adminOnly: true
      },
    ]
  },
  {
    id: 'leo',
    label: 'Leo AI',
    href: '/dashboard/leo',
    icon: 'fa-brain',
    adminOnly: true,
    items: [
      { 
        label: 'Manual Sync', 
        href: '/dashboard/leo/sync',
        adminOnly: true
      },
    ]
  },
];

export default menuConfig;

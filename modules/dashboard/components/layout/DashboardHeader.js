'use client';
import { useRouter } from 'next/router';
import { clearAuthTokens } from '../../../../lib/auth';
import Breadcrumb from '../../../../components/Breadcrumb';

// Map path segments to display names
const segmentLabels = {
  dashboard: 'Dashboard',
  users: 'Users',
  catalog: 'Catalog',
  products: 'Products',
  orders: 'Orders',
  events: 'Events',
  websites: 'Websites',
  commerce: 'Commerce',
  admin: 'Admin',
  settings: 'Settings',
  edit: 'Edit',
  new: 'New',
  inventory: 'Inventory',
  finances: 'Finances',
  subscriptions: 'Subscriptions',
  profile: 'Profile',
  // Add more as needed
};

function formatSegment(segment) {
  // Check if it's a known segment
  if (segmentLabels[segment]) {
    return segmentLabels[segment];
  }
  // Check if it's an ID (numeric or UUID-like)
  if (/^[0-9]+$/.test(segment) || /^[a-f0-9-]{36}$/.test(segment)) {
    return `#${segment.slice(0, 8)}`;
  }
  // Default: capitalize and replace dashes/underscores
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function DashboardHeader() {
  const router = useRouter();
  
  const handleLogout = () => {
    clearAuthTokens();
    window.location.href = '/logout';
  };

  // Build breadcrumbs from current path
  const buildBreadcrumbs = () => {
    const path = router.asPath.split('?')[0]; // Remove query params
    const segments = path.split('/').filter(Boolean);
    
    const breadcrumbs = [];
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        label: formatSegment(segment),
        href: currentPath,
        isLast: index === segments.length - 1
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-container">
        {/* Logo Section */}
        <div className="dashboard-header-logo">
          <a href="/">
            <img
              src="/static_media/brakebee-logo.png"
              alt="Brakebee Logo"
              onError={(e) => {
                e.target.src = '/static_media/logo.png';
              }}
            />
          </a>
        </div>

        {/* Action Buttons - using global secondary button styles */}
        <div className="dashboard-header-actions">
          <button onClick={() => window.location.href = '/'} className="secondary">Home</button>
          <button onClick={handleLogout} className="secondary">Logout</button>
        </div>
      </div>
      
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="dashboard-breadcrumbs">
          <Breadcrumb items={breadcrumbs.map(crumb => ({
            label: crumb.label,
            href: crumb.isLast ? undefined : crumb.href
          }))} />
        </div>
      )}
    </header>
  );
}

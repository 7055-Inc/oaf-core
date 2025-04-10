import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './DashboardMenu.css';

// Menu item configuration
const baseMenuItems = [
  {
    id: 'home',
    label: 'Dashboard Home',
    icon: 'fa-home',
    path: '/dashboard'
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: 'fa-user',
    path: '/dashboard/profile'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'fa-bell',
    path: '/dashboard/notifications',
    badge: 3 // Example badge count
  }
];

// User type specific menus
const userTypeMenus = {
  admin: [
    {
      id: 'admin',
      label: 'Admin',
      icon: 'fa-shield-alt',
      isSection: true,
      items: [
        {
          id: 'users',
          label: 'User Management',
          icon: 'fa-users',
          path: '/dashboard/admin/users'
        },
        {
          id: 'announcements',
          label: 'Announcements',
          icon: 'fa-bullhorn',
          path: '/dashboard/admin/announcements'
        },
        {
          id: 'settings',
          label: 'System Settings',
          icon: 'fa-cogs',
          path: '/dashboard/admin/settings'
        }
      ]
    }
  ],
  artist: [
    {
      id: 'artist',
      label: 'Artist',
      icon: 'fa-palette',
      isSection: true,
      items: [
        {
          id: 'portfolio',
          label: 'Portfolio',
          icon: 'fa-images',
          path: '/dashboard/artist/portfolio'
        },
        {
          id: 'products',
          label: 'My Products',
          icon: 'fa-shopping-bag',
          path: '/dashboard/artist/products'
        },
        {
          id: 'sales',
          label: 'Sales Reports',
          icon: 'fa-chart-line',
          path: '/dashboard/artist/sales'
        }
      ]
    }
  ],
  promoter: [
    {
      id: 'promoter',
      label: 'Promoter',
      icon: 'fa-bullhorn',
      isSection: true,
      items: [
        {
          id: 'events',
          label: 'Events',
          icon: 'fa-calendar-alt',
          path: '/dashboard/promoter/events'
        },
        {
          id: 'campaigns',
          label: 'Campaigns',
          icon: 'fa-ad',
          path: '/dashboard/promoter/campaigns'
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: 'fa-chart-pie',
          path: '/dashboard/promoter/analytics'
        }
      ]
    }
  ],
  community: [
    {
      id: 'community',
      label: 'Community',
      icon: 'fa-users',
      isSection: true,
      items: [
        {
          id: 'favorites',
          label: 'My Favorites',
          icon: 'fa-heart',
          path: '/dashboard/community/favorites'
        },
        {
          id: 'purchases',
          label: 'My Purchases',
          icon: 'fa-shopping-cart',
          path: '/dashboard/community/purchases'
        }
      ]
    }
  ]
};

/**
 * Dashboard menu component with base and user-type specific sections
 */
const DashboardMenu = ({ userType, collapsed }) => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
  
  // Get menu items for the current user type
  const userMenu = userTypeMenus[userType] || [];
  
  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Render a menu item
  const renderMenuItem = (item) => {
    return (
      <li 
        key={item.id} 
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
      >
        <Link to={item.path}>
          <i className={`fas ${item.icon}`}></i>
          {!collapsed && (
            <>
              <span className="menu-label">{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </>
          )}
        </Link>
      </li>
    );
  };
  
  // Render a section with sub-items
  const renderSection = (section) => {
    const isExpanded = expandedSections[section.id];
    
    return (
      <div key={section.id} className="menu-section">
        <div 
          className={`section-header ${isExpanded ? 'expanded' : ''}`}
          onClick={() => toggleSection(section.id)}
        >
          <i className={`fas ${section.icon}`}></i>
          {!collapsed && (
            <>
              <span className="section-label">{section.label}</span>
              <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} section-toggle`}></i>
            </>
          )}
        </div>
        
        {(!collapsed || isExpanded) && (
          <ul className={`section-items ${isExpanded ? 'expanded' : ''}`}>
            {section.items.map(item => renderMenuItem(item))}
          </ul>
        )}
      </div>
    );
  };
  
  return (
    <nav className="dashboard-menu">
      {/* Base menu for all users */}
      <div className="menu-base">
        <ul className="menu-items">
          {baseMenuItems.map(item => renderMenuItem(item))}
        </ul>
      </div>
      
      {/* User type specific menu */}
      <div className="menu-user-type">
        {userMenu.map(section => renderSection(section))}
      </div>
    </nav>
  );
};

export default DashboardMenu; 
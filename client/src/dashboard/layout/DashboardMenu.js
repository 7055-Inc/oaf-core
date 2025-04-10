import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './DashboardMenu.css';

/**
 * Ultra-simple flat menu with absolutely no collapsing functionality
 */
const DashboardMenu = ({ userType }) => {
  const location = useLocation();
  
  // Check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Generate all menu links
  const getAllLinks = () => {
    // Common links first
    const links = [
      {
        id: 'dashboard',
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
        path: '/dashboard/notifications'
      }
    ];
    
    // Add admin links if admin
    if (userType === 'admin') {
      links.push(
        {
          id: 'admin-users',
          label: 'User Management',
          icon: 'fa-users',
          path: '/dashboard/admin/users'
        },
        {
          id: 'admin-announcements',
          label: 'Announcements',
          icon: 'fa-bullhorn',
          path: '/dashboard/admin/announcements'
        },
        {
          id: 'admin-settings',
          label: 'System Settings',
          icon: 'fa-cogs',
          path: '/dashboard/admin/settings'
        }
      );
    }
    
    // Add artist links if artist
    if (userType === 'artist') {
      links.push(
        {
          id: 'artist-portfolio',
          label: 'Portfolio',
          icon: 'fa-images',
          path: '/dashboard/artist/portfolio'
        },
        {
          id: 'artist-products',
          label: 'My Products',
          icon: 'fa-shopping-bag', 
          path: '/dashboard/artist/products'
        },
        {
          id: 'artist-sales',
          label: 'Sales Reports',
          icon: 'fa-chart-line',
          path: '/dashboard/artist/sales'
        }
      );
    }
    
    // Add promoter links if promoter
    if (userType === 'promoter') {
      links.push(
        {
          id: 'promoter-events',
          label: 'Events',
          icon: 'fa-calendar-alt',
          path: '/dashboard/promoter/events'
        },
        {
          id: 'promoter-campaigns',
          label: 'Campaigns',
          icon: 'fa-ad',
          path: '/dashboard/promoter/campaigns'
        },
        {
          id: 'promoter-analytics',
          label: 'Analytics',
          icon: 'fa-chart-pie',
          path: '/dashboard/promoter/analytics'
        }
      );
    }
    
    // Add community links if community
    if (userType === 'community') {
      links.push(
        {
          id: 'community-favorites',
          label: 'My Favorites',
          icon: 'fa-heart',
          path: '/dashboard/community/favorites'
        },
        {
          id: 'community-purchases',
          label: 'My Purchases',
          icon: 'fa-shopping-cart',
          path: '/dashboard/community/purchases'
        }
      );
    }
    
    return links;
  };
  
  // Get all applicable links
  const menuLinks = getAllLinks();
  
  return (
    <div className="dashboard-menu">
      <ul className="menu-items">
        {menuLinks.map(link => (
          <li key={link.id} className={`menu-item ${isActive(link.path) ? 'active' : ''}`}>
            <Link to={link.path}>
              <i className={`fas ${link.icon}`}></i>
              <span className="menu-label">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardMenu; 
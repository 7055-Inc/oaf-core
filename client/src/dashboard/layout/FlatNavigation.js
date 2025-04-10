import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './FlatNavigation.css';

/**
 * Completely new navigation component for dashboard
 * Implements a flat list of links with no folding/unfolding
 */
const FlatNavigation = ({ userType }) => {
  const location = useLocation();
  
  // Define all navigation links based on user type
  const getNavigationLinks = () => {
    // Common links for all users
    const commonLinks = [
      {
        id: 'dash-home',
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
    
    // User type specific links
    let roleLinks = [];
    
    if (userType === 'admin') {
      roleLinks = [
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
      ];
    } else if (userType === 'artist') {
      roleLinks = [
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
      ];
    }
    // Add other user types as needed
    
    return [...commonLinks, ...roleLinks];
  };
  
  // Check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const links = getNavigationLinks();
  
  return (
    <div className="flat-nav-container">
      {links.map(link => (
        <Link 
          key={link.id}
          to={link.path}
          className={`flat-nav-link ${isActive(link.path) ? 'active' : ''}`}
        >
          <i className={`fas ${link.icon}`}></i>
          <span>{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default FlatNavigation; 
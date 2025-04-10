import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../users/users';
import FlatNavigation from './FlatNavigation';
import AnnouncementBar from './AnnouncementBar';
import './DashboardLayout.css';

/**
 * Main layout component for the dashboard
 * Includes sidebar menu, announcement bar, and content area
 */
const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const { currentUser } = useUser();
  
  // Use whichever user object has the user_type property
  const activeUser = (currentUser && currentUser.user_type) ? currentUser : user;
  const userType = activeUser?.user_type || 'guest';
  
  return (
    <div className="dashboard-layout">
      {/* Dashboard sidebar with flat navigation */}
      <div className="dashboard-sidebar">
        <div className="dashboard-brand">
          <img src="/media/logo.png" alt="OAF Dashboard" className="dashboard-logo" />
        </div>
        <FlatNavigation userType={userType} />
      </div>
      
      {/* Main content area */}
      <div className="dashboard-main">
        {/* Announcement bar */}
        <AnnouncementBar userType={userType} />
        
        {/* Content header with breadcrumbs, title, etc. */}
        <div className="dashboard-content-header">
          <h1>{userType.charAt(0).toUpperCase() + userType.slice(1)}</h1>
          <div className="user-actions">
            <span className="user-type">Role: {userType}</span>
            <span className="user-name">{activeUser?.email}</span>
          </div>
        </div>
        
        {/* Main content */}
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout; 
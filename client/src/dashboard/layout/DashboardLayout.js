import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardLayout.css';

/**
 * Main layout component for the dashboard
 * Includes sidebar menu, announcement bar, and content area
 */
const DashboardLayout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="dashboard-layout">
      <header>
        <div className="header-content">
          <div className="logo">
            <a href="/"><img src="/media/logo.png" alt="OAF Logo" /></a>
          </div>
          <div className="user-info">
            {user && <span>Welcome, {user.displayName || user.email}</span>}
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout; 
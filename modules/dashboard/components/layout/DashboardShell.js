'use client';
import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import Sidebar from './Sidebar';

export default function DashboardShell({ children, userData }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('dashboard-sidebar-collapsed', String(newState));
  };

  return (
    <div className={`dashboard-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        userData={userData} 
        collapsed={sidebarCollapsed} 
        onToggle={handleToggleSidebar} 
      />
      
      <div className="dashboard-main">
        <DashboardHeader />
        
        <main className="dashboard-content">
          <div className="dashboard-content-inner">
            {children}
          </div>
        </main>
        
        <DashboardFooter />
      </div>
    </div>
  );
}

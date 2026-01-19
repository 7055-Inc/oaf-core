'use client';
import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../../../../lib/users';
import { getAuthToken } from '../../../../lib/auth';

export default function DashboardShell({ children, userData: propUserData }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(propUserData || null);
  
  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Fetch user data if not provided
  useEffect(() => {
    if (propUserData) {
      setUserData(propUserData);
      return;
    }
    
    const fetchUser = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        
        const user = await getCurrentUser();
        setUserData(user);
      } catch (err) {
        console.error('Error fetching user for sidebar:', err);
      }
    };
    
    fetchUser();
  }, [propUserData]);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('dashboard-sidebar-collapsed', String(newState));
  };

  return (
    <>
      {/* Fixed header at top */}
      <DashboardHeader />
      
      <div className={`dashboard-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar 
          userData={userData} 
          collapsed={sidebarCollapsed} 
          onToggle={handleToggleSidebar} 
        />
        
        <div className="dashboard-main">
          <main className="dashboard-content">
            <div className="dashboard-content-inner">
              {children}
            </div>
          </main>
          
          <DashboardFooter />
        </div>
      </div>
    </>
  );
}

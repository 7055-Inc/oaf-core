'use client';
import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../../../../lib/users';
import { getAuthToken } from '../../../../lib/auth';
import { authApiRequest } from '../../../../lib/apiUtils';
import { isAdmin as checkIsAdmin } from '../../../../lib/userUtils';

export default function DashboardShell({ children, userData: propUserData }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(propUserData || null);
  const [notifications, setNotifications] = useState({});
  
  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-sidebar-state');
    if (saved === 'collapsed') {
      setSidebarCollapsed(true);
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

  // Fetch notifications for sidebar badges
  useEffect(() => {
    if (!userData) return;
    
    const fetchNotifications = async () => {
      try {
        // Fetch admin notifications if user has admin access
        if (checkIsAdmin(userData)) {
          const adminRes = await authApiRequest('admin/notifications', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (adminRes.ok) {
            const data = await adminRes.json();
            if (data.notifications) {
              setNotifications(prev => ({ ...prev, ...data.notifications }));
            }
          }
        }
        
        // Fetch user ticket notifications
        const ticketRes = await authApiRequest('api/tickets/my/notifications', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (ticketRes.ok) {
          const data = await ticketRes.json();
          if (data.notifications) {
            setNotifications(prev => ({ ...prev, user_tickets: data.notifications.unread || 0 }));
          }
        }
      } catch (err) {
        // Silently fail - notifications are non-critical
      }
    };
    
    fetchNotifications();
    
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('dashboard-sidebar-state', newState ? 'collapsed' : 'open');
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
          notifications={notifications}
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

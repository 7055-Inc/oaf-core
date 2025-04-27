import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from './layout/DashboardLayout';
import AdminDashboard from './user-types/AdminDashboard';
import ArtistDashboard from './user-types/ArtistDashboard';
import PromoterDashboard from './user-types/PromoterDashboard';
import CommunityDashboard from './user-types/CommunityDashboard';
import UserManagement from './admin/UserManagement';
import AnnouncementManagement from './admin/AnnouncementManagement';
import './Dashboard.css';

/**
 * Main Dashboard component
 * Handles routing to dashboard sub-sections
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const detectUserType = () => {
      console.log('Dashboard: Detecting user type');
      try {
        if (!user) {
          console.log('Dashboard: No user found');
          setError('No user found');
          setLoading(false);
          return;
        }
        
        // If we have user_type in currentUser, use that
        if (user && user.user_type) {
          console.log('Dashboard: Using user_type from currentUser:', user.user_type);
          setUserType(user.user_type);
          setLoading(false);
          return;
        }
        
        // Default to "guest" if we can't determine user type
        console.log('Dashboard: Unable to determine user type, defaulting to guest');
        setUserType('guest');
      } catch (err) {
        console.error('Dashboard: Error detecting user type:', err);
        setError('Failed to detect user type');
      } finally {
        setLoading(false);
      }
    };

    detectUserType();
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  /**
   * Renders the appropriate dashboard home based on user type
   */
  const renderDashboardHome = () => {
    console.log('Dashboard: Rendering dashboard for user type:', userType);
    switch (userType) {
      case 'admin':
        return <AdminDashboard />;
      case 'artist':
        return <ArtistDashboard />;
      case 'promoter':
        return <PromoterDashboard />;
      case 'community':
        return <CommunityDashboard />;
      default:
        return (
          <div className="dashboard-error">
            <h2>Invalid User Type</h2>
            <p>Your account type ({userType}) is not recognized.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <Routes>
        {/* Dashboard home - renders based on user type */}
        <Route index element={renderDashboardHome()} />
        
        {/* Admin routes */}
        <Route 
          path="admin/users" 
          element={userType === 'admin' ? <UserManagement /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="admin/announcements" 
          element={userType === 'admin' ? <AnnouncementManagement /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Profile route for all users */}
        <Route path="profile" element={<div>Profile Page (Coming Soon)</div>} />
        
        {/* Notifications route for all users */}
        <Route path="notifications" element={<div>Notifications (Coming Soon)</div>} />
        
        {/* Settings routes for all users */}
        
        {/* Artist routes */}
        <Route 
          path="artist/*" 
          element={userType === 'artist' ? <div>Artist Section (Coming Soon)</div> : <Navigate to="/dashboard" />} 
        />
        
        {/* Promoter routes */}
        <Route 
          path="promoter/*" 
          element={userType === 'promoter' ? <div>Promoter Section (Coming Soon)</div> : <Navigate to="/dashboard" />} 
        />
        
        {/* Community routes */}
        <Route 
          path="community/*" 
          element={userType === 'community' ? <div>Community Section (Coming Soon)</div> : <Navigate to="/dashboard" />} 
        />
        
        {/* Catch-all route for invalid dashboard paths */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard; 
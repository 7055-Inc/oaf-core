import React from 'react';
import './UserTypeDashboard.css';

const AdminDashboard = () => {
  return (
    <div className="user-type-dashboard admin-dashboard">
      <h2>Admin Dashboard</h2>
      <div className="dashboard-section">
        <h3>System Overview</h3>
        <p>Welcome to the admin dashboard. Here you can manage users, content, and system settings.</p>
      </div>
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <ul>
          <li>User Management</li>
          <li>Content Moderation</li>
          <li>System Settings</li>
          <li>Analytics</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard; 
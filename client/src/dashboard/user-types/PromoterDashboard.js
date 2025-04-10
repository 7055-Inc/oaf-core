import React from 'react';
import './UserTypeDashboard.css';

const PromoterDashboard = () => {
  return (
    <div className="user-type-dashboard promoter-dashboard">
      <h2>Promoter Dashboard</h2>
      <div className="dashboard-section">
        <h3>Event Management</h3>
        <p>Create and manage events, track attendance, and promote your shows.</p>
      </div>
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <ul>
          <li>Create New Event</li>
          <li>View Event Analytics</li>
          <li>Manage Artists</li>
          <li>Track Sales</li>
        </ul>
      </div>
    </div>
  );
};

export default PromoterDashboard; 
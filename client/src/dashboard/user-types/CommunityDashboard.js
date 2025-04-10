import React from 'react';
import './UserTypeDashboard.css';

const CommunityDashboard = () => {
  return (
    <div className="user-type-dashboard community-dashboard">
      <h2>Community Dashboard</h2>
      <div className="dashboard-section">
        <h3>Community Features</h3>
        <p>Connect with artists, discover events, and engage with the art community.</p>
      </div>
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <ul>
          <li>Browse Artwork</li>
          <li>View Upcoming Events</li>
          <li>Connect with Artists</li>
          <li>View Favorites</li>
        </ul>
      </div>
    </div>
  );
};

export default CommunityDashboard; 
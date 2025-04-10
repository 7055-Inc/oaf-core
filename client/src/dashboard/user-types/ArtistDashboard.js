import React from 'react';
import './UserTypeDashboard.css';

const ArtistDashboard = () => {
  return (
    <div className="user-type-dashboard artist-dashboard">
      <h2>Artist Dashboard</h2>
      <div className="dashboard-section">
        <h3>Your Artwork</h3>
        <p>Manage your portfolio, upload new pieces, and track your sales.</p>
      </div>
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <ul>
          <li>Upload New Artwork</li>
          <li>View Sales Reports</li>
          <li>Manage Portfolio</li>
          <li>View Messages</li>
        </ul>
      </div>
    </div>
  );
};

export default ArtistDashboard; 
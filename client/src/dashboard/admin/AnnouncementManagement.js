import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import './AnnouncementManagement.css';

/**
 * Announcement Management component for admin dashboard
 * Allows admins to create, edit, and manage announcements for different user types
 */
const AnnouncementManagement = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form states for new announcement
  const [newAnnouncement, setNewAnnouncement] = useState({
    message: '',
    type: 'primary',
    target_users: ['all'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    active: true
  });
  
  // Available tabs and user types
  const tabs = ['all', 'admin', 'artist', 'promoter', 'community'];
  
  // Fetch announcements on component mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        if (!user) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        // In production, this would call the actual API
        // For now, use dummy data
        const dummyAnnouncements = [
          {
            id: 1,
            message: "Welcome to the new dashboard system!",
            type: "primary",
            target_users: ["all"],
            start_date: "2023-10-01",
            end_date: "2023-12-31",
            active: true,
            created_at: "2023-09-15"
          },
          {
            id: 2,
            message: "Admins: New user management features available",
            type: "secondary",
            target_users: ["admin"],
            start_date: "2023-10-01",
            end_date: "2023-12-31",
            active: true,
            created_at: "2023-09-20"
          },
          {
            id: 3,
            message: "Artists: October submission deadline approaching",
            type: "secondary",
            target_users: ["artist"],
            start_date: "2023-10-01",
            end_date: "2023-12-31",
            active: true,
            created_at: "2023-09-25"
          },
          {
            id: 4,
            message: "Promoters: New campaign tools released",
            type: "primary",
            target_users: ["promoter"],
            start_date: "2023-10-05",
            end_date: "2023-11-05",
            active: false, // Inactive announcement
            created_at: "2023-09-28"
          },
          {
            id: 5,
            message: "Community: Check out new artist spotlights",
            type: "secondary",
            target_users: ["community"],
            start_date: "2023-10-10",
            end_date: "2023-12-10",
            active: true,
            created_at: "2023-09-30"
          }
        ];
        
        setAnnouncements(dummyAnnouncements);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Failed to load announcements');
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [user]);
  
  // Filter announcements based on current tab
  const filteredAnnouncements = announcements.filter(announcement => {
    if (currentTab === 'all') return true;
    return announcement.target_users.includes(currentTab);
  });
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAnnouncement(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle target user selection
  const handleTargetUserChange = (e) => {
    const { value, checked } = e.target;
    
    // Update target_users array based on checkbox state
    setNewAnnouncement(prev => {
      let updatedTargetUsers;
      
      if (checked) {
        // Add the value to the array if it's not already included
        updatedTargetUsers = [...prev.target_users, value];
      } else {
        // Remove the value from the array
        updatedTargetUsers = prev.target_users.filter(user => user !== value);
      }
      
      return {
        ...prev,
        target_users: updatedTargetUsers
      };
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // In production, this would call the API to save the announcement
    const newId = announcements.length + 1;
    const createdAnnouncement = {
      ...newAnnouncement,
      id: newId,
      created_at: new Date().toISOString().split('T')[0]
    };
    
    // Add to announcements list
    setAnnouncements([...announcements, createdAnnouncement]);
    
    // Reset form
    setNewAnnouncement({
      message: '',
      type: 'primary',
      target_users: ['all'],
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      active: true
    });
    
    // Hide form
    setShowCreateForm(false);
  };
  
  // Toggle announcement active status
  const toggleAnnouncementStatus = (id) => {
    setAnnouncements(announcements.map(announcement => {
      if (announcement.id === id) {
        return {
          ...announcement,
          active: !announcement.active
        };
      }
      return announcement;
    }));
  };
  
  // Delete announcement
  const deleteAnnouncement = (id) => {
    // In production, this would call the API to delete the announcement
    setAnnouncements(announcements.filter(announcement => announcement.id !== id));
  };
  
  if (loading) {
    return <div className="loading">Loading announcements...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="announcement-management">
      <div className="panel-header">
        <h2>Announcement Management</h2>
        <p>Create and manage announcements for different user types</p>
      </div>
      
      {/* Tabs for filtering announcements */}
      <div className="announcement-tabs">
        {tabs.map(tab => (
          <button 
            key={tab} 
            className={`tab-btn ${currentTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab === 'all' ? 'All Announcements' : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Announcements`}
          </button>
        ))}
      </div>
      
      {/* Create announcement button */}
      <div className="announcement-actions">
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Announcement'}
        </button>
      </div>
      
      {/* Create announcement form */}
      {showCreateForm && (
        <div className="announcement-form-container">
          <form onSubmit={handleSubmit} className="announcement-form">
            <div className="form-group">
              <label htmlFor="message">Announcement Message*</label>
              <textarea
                id="message"
                name="message"
                value={newAnnouncement.message}
                onChange={handleInputChange}
                required
                placeholder="Enter announcement message"
                rows={3}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Announcement Style*</label>
                <select
                  id="type"
                  name="type"
                  value={newAnnouncement.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="primary">Primary (Purple)</option>
                  <option value="secondary">Secondary (Blue)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="active">Status</label>
                <select
                  id="active"
                  name="active"
                  value={newAnnouncement.active.toString()}
                  onChange={e => handleInputChange({
                    target: { name: 'active', value: e.target.value === 'true' }
                  })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Start Date*</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={newAnnouncement.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="end_date">End Date*</label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={newAnnouncement.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Target User Types*</label>
              <div className="checkbox-group">
                {tabs.map(tab => tab !== 'all' ? (
                  <label key={tab} className="checkbox-label">
                    <input
                      type="checkbox"
                      name="target_users"
                      value={tab}
                      checked={newAnnouncement.target_users.includes(tab)}
                      onChange={handleTargetUserChange}
                    />
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </label>
                ) : (
                  <label key={tab} className="checkbox-label">
                    <input
                      type="checkbox"
                      name="target_users"
                      value={tab}
                      checked={newAnnouncement.target_users.includes(tab)}
                      onChange={handleTargetUserChange}
                    />
                    All Users
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn">Create Announcement</button>
              <button type="button" className="cancel-btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      
      {/* Announcements list */}
      <div className="announcements-list">
        {filteredAnnouncements.length === 0 ? (
          <div className="no-announcements">
            No announcements found for this filter.
          </div>
        ) : (
          filteredAnnouncements.map(announcement => (
            <div 
              key={announcement.id} 
              className={`announcement-card ${announcement.active ? '' : 'inactive'}`}
            >
              <div className={`announcement-indicator ${announcement.type}`}></div>
              <div className="announcement-content">
                <div className="announcement-header">
                  <div className="announcement-targets">
                    {announcement.target_users.map(target => (
                      <span key={target} className="target-badge">
                        {target === 'all' ? 'All Users' : target.charAt(0).toUpperCase() + target.slice(1)}
                      </span>
                    ))}
                  </div>
                  <div className="announcement-status">
                    <span className={`status-badge ${announcement.active ? 'active' : 'inactive'}`}>
                      {announcement.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="announcement-body">
                  <p className="announcement-message">{announcement.message}</p>
                </div>
                
                <div className="announcement-footer">
                  <div className="announcement-dates">
                    <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                    <span>Active: {new Date(announcement.start_date).toLocaleDateString()} - {new Date(announcement.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="announcement-actions">
                    <button 
                      className="action-btn toggle-btn" 
                      onClick={() => toggleAnnouncementStatus(announcement.id)}
                      title={announcement.active ? 'Deactivate' : 'Activate'}
                    >
                      <i className={`fas fa-${announcement.active ? 'eye-slash' : 'eye'}`}></i>
                    </button>
                    <button 
                      className="action-btn edit-btn" 
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => deleteAnnouncement(announcement.id)}
                      title="Delete"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementManagement; 
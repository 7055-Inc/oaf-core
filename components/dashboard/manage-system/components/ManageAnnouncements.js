import React, { useState, useEffect } from 'react';
import WYSIWYGEditor from '../../../WYSIWYGEditor';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

const ManageAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit', 'stats'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementStats, setAnnouncementStats] = useState(null);

  // Form state for announcement creation/editing
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    show_from: '',
    expires_at: '',
    target_user_types: [],
    is_active: true
  });

  // Available user types for targeting
  const userTypes = [
    { value: 'artist', label: 'Artists' },
    { value: 'promoter', label: 'Promoters' },
    { value: 'community', label: 'Community Members' },
    { value: 'admin', label: 'Administrators' }
  ];

  // Load announcements on component mount
  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Load announcements from API
  const loadAnnouncements = async () => {
    try {
      const response = await authApiRequest('api/announcements', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load announcements: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setAnnouncements([]);
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load announcement statistics
  const loadAnnouncementStats = async (announcementId) => {
    try {
      const response = await authenticatedApiRequest(`api/announcements/${announcementId}/stats`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load announcement stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAnnouncementStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading announcement stats:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle user type selection
  const handleUserTypeChange = (userType) => {
    setFormData(prev => {
      // Ensure target_user_types is always an array
      const currentTypes = Array.isArray(prev.target_user_types) ? prev.target_user_types : [];
      
      return {
        ...prev,
        target_user_types: currentTypes.includes(userType)
          ? currentTypes.filter(type => type !== userType)
          : [...currentTypes, userType]
      };
    });
  };

  // Handle content change from WYSIWYG editor
  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content: content
    }));
  };

  // Handle announcement creation
  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.content || !formData.show_from || !formData.expires_at || formData.target_user_types.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate dates
    const showFromDate = new Date(formData.show_from);
    const expiresAtDate = new Date(formData.expires_at);
    if (showFromDate >= expiresAtDate) {
      setError('Show from date must be before expires at date');
      return;
    }

    try {
      const response = await authApiRequest('api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create announcement');
      }

      const newAnnouncement = await response.json();
      loadAnnouncements(); // Reload the list
      resetForm();
      setActiveView('list');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error creating announcement:', err);
    }
  };

  // Handle announcement update
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.content || !formData.show_from || !formData.expires_at || formData.target_user_types.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate dates
    const showFromDate = new Date(formData.show_from);
    const expiresAtDate = new Date(formData.expires_at);
    if (showFromDate >= expiresAtDate) {
      setError('Show from date must be before expires at date');
      return;
    }

    try {
      const response = await authenticatedApiRequest(`api/announcements/${selectedAnnouncement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update announcement');
      }

      loadAnnouncements(); // Reload the list
      resetForm();
      setActiveView('list');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error updating announcement:', err);
    }
  };

  // Handle announcement deletion
  const handleDelete = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This will also delete all acknowledgment records.')) {
      return;
    }

    try {
      const response = await authenticatedApiRequest(`api/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting announcement:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      show_from: '',
      expires_at: '',
      target_user_types: [],
      is_active: true
    });
    setSelectedAnnouncement(null);
    setError(null);
  };

  // Start editing an announcement
  const startEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    // Ensure target_user_types is always an array
    let targetUserTypes = announcement.target_user_types || [];
    if (typeof targetUserTypes === 'string') {
      try {
        targetUserTypes = JSON.parse(targetUserTypes);
      } catch (e) {
        targetUserTypes = [];
      }
    }
    if (!Array.isArray(targetUserTypes)) {
      targetUserTypes = [];
    }
    
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      show_from: announcement.show_from ? new Date(announcement.show_from).toISOString().slice(0, 16) : '',
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '',
      target_user_types: targetUserTypes,
      is_active: announcement.is_active !== undefined ? announcement.is_active : true
    });
    setActiveView('edit');
  };

  // Show announcement statistics
  const showStats = (announcement) => {
    setSelectedAnnouncement(announcement);
    loadAnnouncementStats(announcement.id);
    setActiveView('stats');
  };

  // Filter announcements
  const filteredAnnouncements = (Array.isArray(announcements) ? announcements : []).filter(announcement => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && announcement.is_active) ||
      (statusFilter === 'inactive' && !announcement.is_active) ||
      (statusFilter === 'current' && announcement.is_active && 
        new Date(announcement.show_from) <= new Date() && 
        new Date(announcement.expires_at) > new Date()) ||
      (statusFilter === 'expired' && new Date(announcement.expires_at) <= new Date());
    
    const matchesSearch = searchTerm === '' || 
      (announcement.title && announcement.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  // Get status for announcement
  const getAnnouncementStatus = (announcement) => {
    if (!announcement.is_active) return 'inactive';
    
    const now = new Date();
    const showFrom = new Date(announcement.show_from);
    const expiresAt = new Date(announcement.expires_at);
    
    if (now < showFrom) return 'scheduled';
    if (now > expiresAt) return 'expired';
    return 'current';
  };

  // Get default dates for new announcements (show from now, expire in 7 days)
  const getDefaultDates = () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      show_from: now.toISOString().slice(0, 16),
      expires_at: oneWeekFromNow.toISOString().slice(0, 16)
    };
  };

  const getAnnouncementStatusClass = (announcement) => {
    const status = getAnnouncementStatus(announcement);
    switch (status) {
      case 'current': return styles.statusCompleted;
      case 'scheduled': return styles.statusPending;
      case 'expired': return styles.statusFailed;
      case 'inactive': return styles.statusDefault;
      default: return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading announcements...</p>
      </div>
    );
  }

  if (error && activeView === 'list') {
    return (
      <div className="error-alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {error && activeView !== 'list' && (
        <div className="error-alert">
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div></div>
        <div>
          {activeView === 'list' && (
            <button 
              className="primary"
              onClick={() => {
                resetForm();
                const defaultDates = getDefaultDates();
                setFormData(prev => ({
                  ...prev,
                  ...defaultDates
                }));
                setActiveView('create');
              }}
            >
              Create New Announcement
            </button>
          )}
          {activeView !== 'list' && (
            <button 
              className="secondary"
              onClick={() => {
                resetForm();
                setActiveView('list');
              }}
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* List View */}
      {activeView === 'list' && (
        <div>
          {/* Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginBottom: '20px', 
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ width: '180px' }}
              >
                <option value="all">All Announcements</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="current">Currently Showing</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>Search:</label>
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ width: '250px' }}
              />
            </div>
          </div>

          {/* Announcements Table */}
          <div className="section-box">
            <table className={styles.table}>
              <caption className="sr-only">System announcements</caption>
              <thead className={styles.tableHeader}>
                <tr className={styles.tableRow}>
                  <th scope="col" className={styles.tableHeaderCell}>Title</th>
                  <th scope="col" className={styles.tableHeaderCell}>Target Users</th>
                  <th scope="col" className={styles.tableHeaderCell}>Show From</th>
                  <th scope="col" className={styles.tableHeaderCell}>Expires At</th>
                  <th scope="col" className={styles.tableHeaderCell}>Status</th>
                  <th scope="col" className={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map(announcement => (
                  <tr key={announcement.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{announcement.title}</strong>
                        <div style={{ fontSize: '12px', color: '#6c757d', lineHeight: '1.4' }}>
                          {announcement.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div style={{ fontSize: '13px' }}>
                        {announcement.target_user_types.map(type => 
                          userTypes.find(ut => ut.value === type)?.label || type
                        ).join(', ')}
                      </div>
                    </td>
                    <td className={styles.tableCell}>{formatDate(announcement.show_from)}</td>
                    <td className={styles.tableCell}>{formatDate(announcement.expires_at)}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${getAnnouncementStatusClass(announcement)}`}>
                        {getAnnouncementStatus(announcement)}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          className="secondary"
                          onClick={() => startEdit(announcement)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="primary"
                          onClick={() => showStats(announcement)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Stats
                        </button>
                        <button 
                          className="danger"
                          onClick={() => handleDelete(announcement.id)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAnnouncements.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#6c757d'
              }}>
                <p style={{ marginBottom: '20px' }}>No announcements found matching your criteria.</p>
                <button 
                  className="primary"
                  onClick={() => {
                    resetForm();
                    const defaultDates = getDefaultDates();
                    setFormData(prev => ({
                      ...prev,
                      ...defaultDates
                    }));
                    setActiveView('create');
                  }}
                >
                  Create Your First Announcement
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcement Creation/Edit Form */}
      {(activeView === 'create' || activeView === 'edit') && (
        <div className="form-card">
          <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
            {/* Basic Information */}
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                margin: '0 0 15px 0', 
                color: '#495057',
                fontSize: '16px',
                borderBottom: '2px solid #495057',
                paddingBottom: '8px'
              }}>Announcement Information</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: '500', 
                  color: '#495057' 
                }}>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Enter announcement title..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Show From *</label>
                  <input
                    type="datetime-local"
                    name="show_from"
                    value={formData.show_from}
                    onChange={handleInputChange}
                    required
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Expires At *</label>
                  <input
                    type="datetime-local"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleInputChange}
                    required
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Target User Types *</label>
                  <div className={styles.topicCheckboxes}>
                    {userTypes.map(userType => (
                      <label key={userType.value} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(formData.target_user_types) && formData.target_user_types.includes(userType.value)}
                          onChange={() => handleUserTypeChange(userType.value)}
                        />
                        {userType.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <div className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    Active (announcement will show to users)
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className={styles.formSection}>
              <h3>Announcement Content</h3>
              <WYSIWYGEditor
                value={formData.content}
                onChange={handleContentChange}
                title="Announcement Content"
                height={400}
                placeholder="Write your announcement content here..."
                allowImageUpload={true}
                imageUploadPath="/api/announcements/upload-image"
              />
            </div>

            {/* Form Actions */}
            <div className={styles.formSection}>
              <div className={styles.formActions}>
                <button 
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveView('list');
                  }}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={styles.primaryButton}
                >
                  {activeView === 'create' ? 'Create Announcement' : 'Update Announcement'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Statistics View */}
      {activeView === 'stats' && selectedAnnouncement && (
        <div className={styles.statsView}>
          <div className={styles.formSection}>
            <h3>Announcement Statistics</h3>
            <div className={styles.announcementInfo}>
              <h4>{selectedAnnouncement.title}</h4>
              <p><strong>Target Users:</strong> {selectedAnnouncement.target_user_types.map(type => 
                userTypes.find(ut => ut.value === type)?.label || type
              ).join(', ')}</p>
              <p><strong>Show From:</strong> {formatDate(selectedAnnouncement.show_from)}</p>
              <p><strong>Expires At:</strong> {formatDate(selectedAnnouncement.expires_at)}</p>
              <p><strong>Status:</strong> 
                <span className={`${styles.statusBadge} ${styles[getAnnouncementStatus(selectedAnnouncement)]}`}>
                  {getAnnouncementStatus(selectedAnnouncement)}
                </span>
              </p>
            </div>

            {announcementStats && (
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{announcementStats.stats.total_target_users}</div>
                  <div className={styles.statLabel}>Total Target Users</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{announcementStats.stats.acknowledged}</div>
                  <div className={styles.statLabel}>Acknowledged</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{announcementStats.stats.remind_later}</div>
                  <div className={styles.statLabel}>Remind Later</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{announcementStats.stats.no_response}</div>
                  <div className={styles.statLabel}>No Response</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{announcementStats.stats.acknowledgment_rate}%</div>
                  <div className={styles.statLabel}>Acknowledgment Rate</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAnnouncements; 
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats
} from '../../../../lib/system/api';

// Dynamic import for BlockEditor to avoid SSR issues
const BlockEditor = dynamic(() => import('../../../shared/block-editor'), { 
  ssr: false,
  loading: () => <div className="loading-state">Loading editor...</div>
});

/**
 * Announcements Management Component
 * 
 * Manages system-wide announcements including:
 * - CRUD operations for announcements
 * - Target user type selection
 * - Date scheduling (show from / expires at)
 * - Acknowledgment statistics
 * 
 * Uses v2 API: /api/v2/system/announcements/*
 */
const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementStats, setAnnouncementStats] = useState(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAllAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setAnnouncements([]);
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncementStats = async (announcementId) => {
    try {
      const data = await getAnnouncementStats(announcementId);
      setAnnouncementStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading announcement stats:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUserTypeChange = (userType) => {
    setFormData(prev => {
      const currentTypes = Array.isArray(prev.target_user_types) ? prev.target_user_types : [];
      return {
        ...prev,
        target_user_types: currentTypes.includes(userType)
          ? currentTypes.filter(type => type !== userType)
          : [...currentTypes, userType]
      };
    });
  };

  const handleContentChange = (content) => {
    const contentToStore = typeof content === 'object' ? JSON.stringify(content) : content;
    setFormData(prev => ({ ...prev, content: contentToStore }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.show_from || !formData.expires_at || formData.target_user_types.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    const showFromDate = new Date(formData.show_from);
    const expiresAtDate = new Date(formData.expires_at);
    if (showFromDate >= expiresAtDate) {
      setError('Show from date must be before expires at date');
      return;
    }

    try {
      setSaving(true);
      await createAnnouncement(formData);
      await loadAnnouncements();
      resetForm();
      setActiveView('list');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error creating announcement:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.show_from || !formData.expires_at || formData.target_user_types.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    const showFromDate = new Date(formData.show_from);
    const expiresAtDate = new Date(formData.expires_at);
    if (showFromDate >= expiresAtDate) {
      setError('Show from date must be before expires at date');
      return;
    }

    try {
      setSaving(true);
      await updateAnnouncement(selectedAnnouncement.id, formData);
      await loadAnnouncements();
      resetForm();
      setActiveView('list');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error updating announcement:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This will also delete all acknowledgment records.')) {
      return;
    }

    try {
      await deleteAnnouncement(announcementId);
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting announcement:', err);
    }
  };

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

  const startEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
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

  const showStats = (announcement) => {
    setSelectedAnnouncement(announcement);
    loadAnnouncementStats(announcement.id);
    setActiveView('stats');
  };

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

  const getAnnouncementStatus = (announcement) => {
    if (!announcement.is_active) return 'inactive';
    const now = new Date();
    const showFrom = new Date(announcement.show_from);
    const expiresAt = new Date(announcement.expires_at);
    if (now < showFrom) return 'scheduled';
    if (now > expiresAt) return 'expired';
    return 'current';
  };

  const getDefaultDates = () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      show_from: now.toISOString().slice(0, 16),
      expires_at: oneWeekFromNow.toISOString().slice(0, 16)
    };
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'current': return 'badge badge-success';
      case 'scheduled': return 'badge badge-warning';
      case 'expired': return 'badge badge-danger';
      case 'inactive': return 'badge badge-secondary';
      default: return 'badge badge-secondary';
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
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div>
      {error && activeView !== 'list' && (
        <div className="error-alert">{error}</div>
      )}
      
      <div className="flex-between" style={{ marginBottom: '20px' }}>
        <div></div>
        <div>
          {activeView === 'list' && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                const defaultDates = getDefaultDates();
                setFormData(prev => ({ ...prev, ...defaultDates }));
                setActiveView('create');
              }}
            >
              Create New Announcement
            </button>
          )}
          {activeView !== 'list' && (
            <button 
              className="btn btn-secondary"
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
          <div className="filter-bar">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input form-select"
              >
                <option value="all">All Announcements</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="current">Currently Showing</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Search</label>
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Announcements Table */}
          <div className="section-box">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Target Users</th>
                    <th>Show From</th>
                    <th>Expires At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map(announcement => (
                    <tr key={announcement.id}>
                      <td>
                        <div>
                          <strong>{announcement.title}</strong>
                          <div className="text-muted text-sm">
                            {announcement.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm">
                          {(announcement.target_user_types || []).map(type => 
                            userTypes.find(ut => ut.value === type)?.label || type
                          ).join(', ')}
                        </span>
                      </td>
                      <td>{formatDate(announcement.show_from)}</td>
                      <td>{formatDate(announcement.expires_at)}</td>
                      <td>
                        <span className={getStatusBadgeClass(getAnnouncementStatus(announcement))}>
                          {getAnnouncementStatus(announcement)}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEdit(announcement)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => showStats(announcement)}
                          >
                            Stats
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(announcement.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredAnnouncements.length === 0 && (
              <div className="empty-state">
                <p>No announcements found matching your criteria.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    const defaultDates = getDefaultDates();
                    setFormData(prev => ({ ...prev, ...defaultDates }));
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
            <div className="section-box">
              <h3 className="form-section-title">Announcement Information</h3>
              
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter announcement title..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Show From *</label>
                  <input
                    type="datetime-local"
                    name="show_from"
                    value={formData.show_from}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expires At *</label>
                  <input
                    type="datetime-local"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Target User Types *</label>
                  <div className="checkbox-group">
                    {userTypes.map(userType => (
                      <label key={userType.value} className="checkbox-label">
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

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    Active (announcement will show to users)
                  </label>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="section-box">
              <h3 className="form-section-title">Announcement Content</h3>
              <BlockEditor
                value={formData.content}
                onChange={handleContentChange}
                minHeight={400}
                placeholder="Write your announcement content here..."
                imageUploadEndpoint="/api/v2/media/upload"
              />
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button 
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveView('list');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : (activeView === 'create' ? 'Create Announcement' : 'Update Announcement')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics View */}
      {activeView === 'stats' && selectedAnnouncement && (
        <div className="section-box">
          <h3 className="form-section-title">Announcement Statistics</h3>
          
          <div className="info-card">
            <h4>{selectedAnnouncement.title}</h4>
            <p><strong>Target Users:</strong> {(selectedAnnouncement.target_user_types || []).map(type => 
              userTypes.find(ut => ut.value === type)?.label || type
            ).join(', ')}</p>
            <p><strong>Show From:</strong> {formatDate(selectedAnnouncement.show_from)}</p>
            <p><strong>Expires At:</strong> {formatDate(selectedAnnouncement.expires_at)}</p>
            <p><strong>Status:</strong>{' '}
              <span className={getStatusBadgeClass(getAnnouncementStatus(selectedAnnouncement))}>
                {getAnnouncementStatus(selectedAnnouncement)}
              </span>
            </p>
          </div>

          {announcementStats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{announcementStats.stats.total_target_users}</div>
                <div className="stat-label">Total Target Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{announcementStats.stats.acknowledged}</div>
                <div className="stat-label">Acknowledged</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{announcementStats.stats.remind_later}</div>
                <div className="stat-label">Remind Later</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{announcementStats.stats.no_response}</div>
                <div className="stat-label">No Response</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{announcementStats.stats.acknowledgment_rate}%</div>
                <div className="stat-label">Acknowledgment Rate</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Announcements;

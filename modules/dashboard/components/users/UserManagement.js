/**
 * User Management Hub
 * 
 * Comprehensive user management dashboard with expandable rows.
 * Uses v2 API endpoints via lib/users/api.js
 * Uses global CSS classes from global.css
 * 
 * Admin-only component - visible only to admin users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  listUsers, 
  adminGetUser, 
  adminUpdatePermissions 
} from '../../../../lib/users/api';
import { startImpersonation } from '../../../../lib/auth';

// Permission definitions
const PERMISSIONS = [
  { key: 'vendor', label: 'Vendor', description: 'Can sell products' },
  { key: 'events', label: 'Events', description: 'Can create/manage events' },
  { key: 'stripe_connect', label: 'Stripe Connect', description: 'Has Stripe Connect setup' },
  { key: 'verified', label: 'Verified', description: 'Verified artist status' },
  { key: 'marketplace', label: 'Marketplace', description: 'Can access marketplace' },
  { key: 'manage_sites', label: 'Manage Sites', description: 'Can manage sites' },
  { key: 'manage_content', label: 'Manage Content', description: 'Can manage content' },
  { key: 'manage_system', label: 'Manage System', description: 'System admin access' },
];

// User type options
const USER_TYPES = ['artist', 'promoter', 'community', 'admin'];
const USER_STATUSES = ['active', 'inactive', 'suspended', 'draft'];

const UserManagement = () => {
  // State
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  
  // Expansion state
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({});
  
  // User details cache
  const [userDetails, setUserDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(new Set());
  
  // Action states
  const [savingPermissions, setSavingPermissions] = useState(new Set());

  // Fetch users on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [currentPage, perPage, filterType, filterStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: perPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.user_type = filterType;
      if (filterStatus) params.status = filterStatus;
      
      const result = await listUsers(params);
      
      setUsers(result.users);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    if (userDetails[userId] || loadingDetails.has(userId)) return;
    
    setLoadingDetails(prev => new Set(prev).add(userId));
    
    try {
      const data = await adminGetUser(userId);
      setUserDetails(prev => ({ ...prev, [userId]: data }));
    } catch (err) {
      // Silent fail - details are optional
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Toggle user expansion
  const toggleUserExpansion = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        fetchUserDetails(userId);
      }
      return next;
    });
  };

  // Toggle section within expanded user
  const toggleSection = (userId, section) => {
    setExpandedSections(prev => {
      const userSections = new Set(prev[userId] || []);
      if (userSections.has(section)) {
        userSections.delete(section);
      } else {
        userSections.add(section);
      }
      return { ...prev, [userId]: userSections };
    });
  };

  const isSectionExpanded = (userId, section) => {
    return expandedSections[userId]?.has(section) || false;
  };

  // Update permission
  const updatePermission = async (userId, permKey, value) => {
    setSavingPermissions(prev => new Set(prev).add(`${userId}-${permKey}`));
    
    try {
      await adminUpdatePermissions(userId, { [permKey]: value });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, permissions: { ...user.permissions, [permKey]: value } }
          : user
      ));
      
      setMessage({ text: 'Permission updated', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPermissions(prev => {
        const next = new Set(prev);
        next.delete(`${userId}-${permKey}`);
        return next;
      });
    }
  };

  // Impersonate user
  const handleImpersonate = async (user) => {
    const confirmed = window.confirm(
      `Impersonate ${user.username}?\n\nYou will be logged in as this user. All actions are logged.`
    );
    if (!confirmed) return;

    try {
      await startImpersonation(user.id, 'Admin review from User Management Hub');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(`Failed to impersonate: ${err.message}`);
    }
  };

  // Status styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'muted';
      case 'suspended': return 'danger';
      case 'draft': return 'muted';
      default: return 'muted';
    }
  };

  const getUserTypeClass = (type) => {
    switch (type) {
      case 'artist': return 'info';
      case 'promoter': return 'warning';
      case 'community': return 'success';
      case 'admin': return 'danger';
      default: return 'muted';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {message.text && (
        <div className={`${message.type}-alert`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
          {message.text}
        </div>
      )}

      {/* Search and Filters */}
      <div className="form-card">
        <div className="list-filters">
          <div className="filter-row">
            <div className="search-box">
              <i className="fa-solid fa-search"></i>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              value={filterType} 
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Types</option>
              {USER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select 
              value={filterStatus} 
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Statuses</option>
              {USER_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <button onClick={fetchUsers} className="secondary">
              <i className="fa-solid fa-refresh"></i> Refresh
            </button>
          </div>
          
          <div className="filter-stats">
            <span>Total: {meta.total}</span>
            <span>Page {meta.page} of {meta.totalPages || 1}</span>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="expandable-list">
        {users.map(user => (
          <div key={user.id} className={`expandable-row ${expandedUsers.has(user.id) ? 'expanded' : ''}`}>
            {/* User Header Row */}
            <div className="expandable-row-header" onClick={() => toggleUserExpansion(user.id)}>
              <div className="expandable-row-toggle">
                <i className={`fa-solid fa-chevron-${expandedUsers.has(user.id) ? 'down' : 'right'}`}></i>
              </div>
              
              <div style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'monospace', minWidth: '70px' }}>#{user.id}</div>
              
              <div style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{user.username}</span>
                {user.first_name && (
                  <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                    ({user.first_name} {user.last_name})
                  </span>
                )}
              </div>
              
              <div style={{ minWidth: '100px' }}>
                <span className={`status-badge ${getUserTypeClass(user.user_type)}`}>
                  {user.user_type}
                </span>
              </div>
              
              <div style={{ minWidth: '100px' }}>
                <span className={`status-badge ${getStatusClass(user.status)}`}>
                  {user.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', minWidth: '100px' }}>
                {user.permissions?.verified && (
                  <i className="fa-solid fa-badge-check" title="Verified" style={{ color: '#10b981' }}></i>
                )}
                {user.permissions?.vendor && (
                  <i className="fa-solid fa-store" title="Vendor" style={{ color: '#3b82f6' }}></i>
                )}
                {user.permissions?.stripe_connect && (
                  <i className="fa-brands fa-stripe" title="Stripe Connected" style={{ color: '#635bff' }}></i>
                )}
                {user.permissions?.manage_system && (
                  <i className="fa-solid fa-shield" title="System Admin" style={{ color: '#f59e0b' }}></i>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="warning small"
                  onClick={() => handleImpersonate(user)}
                  title="Act as this user"
                >
                  <i className="fa-solid fa-user-secret"></i>
                </button>
                <a 
                  href={`/profile/${user.id}`}
                  target="_blank"
                  className="secondary small"
                  title="View profile"
                >
                  <i className="fa-solid fa-external-link"></i>
                </a>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedUsers.has(user.id) && (
              <div className="expandable-row-content">
                {loadingDetails.has(user.id) ? (
                  <div className="loading-inline">
                    <i className="fa-solid fa-spinner fa-spin"></i> Loading details...
                  </div>
                ) : (
                  <>
                    {/* Permissions Section */}
                    <div className="expansion-section">
                      <div 
                        className="expansion-section-header"
                        onClick={() => toggleSection(user.id, 'permissions')}
                      >
                        <i className={`fa-solid fa-chevron-${isSectionExpanded(user.id, 'permissions') ? 'down' : 'right'}`}></i>
                        <i className="fa-solid fa-key expansion-section-icon"></i>
                        <span>Permissions</span>
                        <span className="expansion-section-badge">
                          {PERMISSIONS.filter(p => user.permissions?.[p.key]).length}/{PERMISSIONS.length}
                        </span>
                      </div>
                      
                      {isSectionExpanded(user.id, 'permissions') && (
                        <div className="expansion-section-content">
                          <div className="toggle-grid">
                            {PERMISSIONS.map(perm => {
                              const isAdmin = user.user_type === 'admin';
                              const isAutoEnabled = isAdmin && ['manage_sites', 'manage_content', 'manage_system'].includes(perm.key);
                              const isEnabled = user.permissions?.[perm.key] || isAutoEnabled;
                              const isSaving = savingPermissions.has(`${user.id}-${perm.key}`);
                              
                              return (
                                <div key={perm.key} className={`toggle-item ${isEnabled ? 'enabled' : ''}`}>
                                  <label className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      disabled={isAutoEnabled || isSaving}
                                      onChange={(e) => updatePermission(user.id, perm.key, e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                  </label>
                                  <div className="toggle-item-info">
                                    <span className="toggle-item-label">{perm.label}</span>
                                    <span className="toggle-item-desc">{perm.description}</span>
                                    {isAutoEnabled && <span className="auto-tag">Auto (Admin)</span>}
                                  </div>
                                  {isSaving && <i className="fa-solid fa-spinner fa-spin"></i>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Verification Section */}
                    <div className="expansion-section">
                      <div 
                        className="expansion-section-header"
                        onClick={() => toggleSection(user.id, 'verification')}
                      >
                        <i className={`fa-solid fa-chevron-${isSectionExpanded(user.id, 'verification') ? 'down' : 'right'}`}></i>
                        <i className="fa-solid fa-certificate expansion-section-icon"></i>
                        <span>Verification Status</span>
                        <span className={`expansion-section-badge ${user.permissions?.verified ? 'badge-success' : 'badge-muted'}`}>
                          {user.permissions?.verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                      
                      {isSectionExpanded(user.id, 'verification') && (
                        <div className="expansion-section-content">
                          <div className={`status-indicator ${user.permissions?.verified ? 'verified' : 'unverified'}`}>
                            <i className={`fa-solid ${user.permissions?.verified ? 'fa-badge-check' : 'fa-circle-xmark'}`}></i>
                            <span>{user.permissions?.verified ? 'Verified Artist' : 'Not Verified'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stripe Section */}
                    <div className="expansion-section">
                      <div 
                        className="expansion-section-header"
                        onClick={() => toggleSection(user.id, 'stripe')}
                      >
                        <i className={`fa-solid fa-chevron-${isSectionExpanded(user.id, 'stripe') ? 'down' : 'right'}`}></i>
                        <i className="fa-brands fa-stripe expansion-section-icon"></i>
                        <span>Stripe Connect</span>
                        <span className={`expansion-section-badge ${user.permissions?.stripe_connect ? 'badge-success' : 'badge-muted'}`}>
                          {user.permissions?.stripe_connect ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      
                      {isSectionExpanded(user.id, 'stripe') && (
                        <div className="expansion-section-content">
                          <div className={`status-indicator ${user.permissions?.stripe_connect ? 'connected' : 'disconnected'}`}>
                            <i className="fa-brands fa-stripe"></i>
                            <span>{user.permissions?.stripe_connect ? 'Stripe Connected' : 'Not Connected'}</span>
                          </div>
                          
                          {!user.permissions?.stripe_connect && (
                            <p style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '14px', color: '#6b7280' }}>
                              User has not connected a Stripe account.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Activity Section */}
                    <div className="expansion-section">
                      <div 
                        className="expansion-section-header"
                        onClick={() => toggleSection(user.id, 'activity')}
                      >
                        <i className={`fa-solid fa-chevron-${isSectionExpanded(user.id, 'activity') ? 'down' : 'right'}`}></i>
                        <i className="fa-solid fa-clock-rotate-left expansion-section-icon"></i>
                        <span>Activity Summary</span>
                      </div>
                      
                      {isSectionExpanded(user.id, 'activity') && (
                        <div className="expansion-section-content">
                          <div className="stat-grid">
                            <div className="stat-item">
                              <span className="stat-label">Account Created</span>
                              <span className="stat-value">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                              </span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Last Updated</span>
                              <span className="stat-value">
                                {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
                              </span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Email Verified</span>
                              <span className={`status-badge ${user.email_verified === 'yes' ? 'success' : 'pending'}`}>
                                {user.email_verified === 'yes' ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="quick-links" style={{ marginTop: '16px' }}>
                            <a href={`/profile/${user.id}`} target="_blank" className="secondary small">
                              <i className="fa-solid fa-external-link"></i> View Profile
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
            className="secondary small"
          >
            <i className="fa-solid fa-angles-left"></i>
          </button>
          <button 
            onClick={() => setCurrentPage(p => p - 1)} 
            disabled={currentPage === 1}
            className="secondary small"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {meta.totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => p + 1)} 
            disabled={currentPage === meta.totalPages}
            className="secondary small"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <button 
            onClick={() => setCurrentPage(meta.totalPages)} 
            disabled={currentPage === meta.totalPages}
            className="secondary small"
          >
            <i className="fa-solid fa-angles-right"></i>
          </button>
          
          <select 
            value={perPage} 
            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

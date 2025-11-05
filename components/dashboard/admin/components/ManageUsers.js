'use client';
import { useState, useEffect } from 'react';
import { getAuthToken, authenticatedApiRequest } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    // Base user fields
    username: '',
    user_type: 'artist',
    status: 'draft',
    email_verified: 'no',
    onboarding_completed: 'no',
    meta_title: '',
    meta_description: '',
    google_uid: '',
    
    // Base profile fields
    first_name: '',
    last_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    profile_image_path: '',
    header_image_path: '',
    display_name: '',
    website: '',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_pinterest: '',
    social_whatsapp: '',
    birth_date: '',
    gender: '',
    nationality: '',
    languages_known: [],
    job_title: '',
    bio: '',
    education: [],
    awards: [],
    memberships: [],
    follows: [],
    timezone: '',
    preferred_currency: '',
    profile_visibility: 'public',
    
    // Artist profile fields
    art_categories: [],
    art_mediums: [],
    business_name: '',
    studio_address_line1: '',
    studio_address_line2: '',
    studio_city: '',
    studio_state: '',
    studio_zip: '',
    artist_biography: '',
    business_phone: '',
    business_website: '',
    business_social_facebook: '',
    business_social_instagram: '',
    business_social_tiktok: '',
    business_social_twitter: '',
    business_social_pinterest: '',
    does_custom: 'no',
    customer_service_email: '',
    legal_name: '',
    tax_id: '',
    founding_date: '',
    business_size: '',
    business_hours: [],
    price_range: '',
    payment_methods: [],
    service_area: [],
    logo_path: '',
    slogan: '',
    art_forms: [],
    art_style: '',
    art_genres: [],
    teaching_credentials: [],
    exhibitions: [],
    collections: [],
    commission_status: 'closed',
    publications: [],
    
    // Promoter profile fields
    organization_name: '',
    organization_type: '',
    promoter_biography: '',
    events_managed: [],
    specialties: [],
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    social_media_links: [],
    service_areas: [],
    years_experience: '',
    certifications: [],
    partnerships: [],
    
    // Community profile fields
    community_name: '',
    community_type: '',
    community_description: '',
    member_count: '',
    founded_date: '',
    meeting_schedule: '',
    contact_info: '',
    social_links: [],
    activities: [],
    membership_requirements: '',
    
    // Admin profile fields
    admin_title: ''
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Please log in to access user management');
        setLoading(false);
        return;
      }

      // Check if user has manage_system permission
      const payload = JSON.parse(atob(token.split('.')[1]));
      const permissions = payload.permissions || [];
      const roles = payload.roles || [];
      
      // Admin users automatically get all permissions, or check for specific permission
      const canManageSystem = roles.includes('admin') || permissions.includes('manage_system');
      
      if (!canManageSystem) {
        setHasPermission(false);
        setError('Access denied. You need "manage_system" permission to manage users.');
        setLoading(false);
        return;
      }
      
      setHasPermission(true);
      fetchUsers();
    } catch (err) {
      setError('Authentication error: ' + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, sortField, sortDirection]);

  const fetchUsers = async () => {
    try {
      const response = await authenticatedApiRequest(getApiUrl('admin/users'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.user_type?.toLowerCase().includes(searchLower) ||
        user.status?.toLowerCase().includes(searchLower)
      );
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested objects
      if (sortField === 'name') {
        aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = async (user) => {
    try {
      // Fetch complete user data including profile information
      const response = await authenticatedApiRequest(getApiUrl(`admin/users/${user.id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await response.json();
      setEditingUser(userData);
      setShowEditModal(true);
    } catch (err) {
      setError(`Failed to load user details: ${err.message}`);
    }
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await authenticatedApiRequest(getApiUrl(`admin/users/${userToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveUser = async (userData) => {
    try {
      const method = userData.id ? 'PUT' : 'POST';
      const url = userData.id 
        ? getApiUrl(`admin/users/${userData.id}`)
        : getApiUrl('admin/users');

      const response = await authenticatedApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to save user');
      }

      const savedUser = await response.json();
      
      if (userData.id) {
        setUsers(users.map(u => u.id === userData.id ? savedUser : u));
      } else {
        setUsers([...users, savedUser]);
      }

      setShowEditModal(false);
      setShowCreateModal(false);
      setEditingUser(null);
      setNewUser({
        username: '',
        user_type: 'artist',
        status: 'draft',
        email_verified: 'no',
        onboarding_completed: 'no',
        meta_title: '',
        meta_description: '',
        google_uid: '',
        first_name: '',
        last_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        profile_image_path: '',
        header_image_path: '',
        display_name: '',
        website: '',
        social_facebook: '',
        social_instagram: '',
        social_tiktok: '',
        social_twitter: '',
        social_pinterest: '',
        social_whatsapp: '',
        birth_date: '',
        gender: '',
        nationality: '',
        languages_known: [],
        job_title: '',
        bio: '',
        education: [],
        awards: [],
        memberships: [],
        follows: [],
        timezone: '',
        preferred_currency: '',
        profile_visibility: 'public',
        art_categories: [],
        art_mediums: [],
        business_name: '',
        studio_address_line1: '',
        studio_address_line2: '',
        studio_city: '',
        studio_state: '',
        studio_zip: '',
        artist_biography: '',
        business_phone: '',
        business_website: '',
        business_social_facebook: '',
        business_social_instagram: '',
        business_social_tiktok: '',
        business_social_twitter: '',
        business_social_pinterest: '',
        does_custom: 'no',
        customer_service_email: '',
        legal_name: '',
        tax_id: '',
        founding_date: '',
        business_size: '',
        business_hours: [],
        price_range: '',
        payment_methods: [],
        service_area: [],
        logo_path: '',
        slogan: '',
        art_forms: [],
        art_style: '',
        art_genres: [],
        teaching_credentials: [],
        exhibitions: [],
        collections: [],
        commission_status: 'closed',
        publications: [],
        organization_name: '',
        organization_type: '',
        promoter_biography: '',
        events_managed: [],
        specialties: [],
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        website_url: '',
        social_media_links: [],
        service_areas: [],
        years_experience: '',
        certifications: [],
        partnerships: [],
        community_name: '',
        community_type: '',
        community_description: '',
        member_count: '',
        founded_date: '',
        meeting_schedule: '',
        contact_info: '',
        social_links: [],
        activities: [],
        membership_requirements: '',
        admin_title: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const getUserTypeStatusClass = (userType) => {
    switch (userType) {
      case 'artist': return styles.statusProcessing;
      case 'promoter': return styles.statusPending;
      case 'community': return styles.statusCompleted;
      case 'admin': return styles.statusDefault;
      default: return styles.statusDefault;
    }
  };

  const getUserStatusClass = (status) => {
    switch (status) {
      case 'active': return styles.statusCompleted;
      case 'inactive': return styles.statusFailed;
      case 'suspended': return styles.statusPending;
      case 'draft': return styles.statusDefault;
      default: return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '300px' }}
          />
          <span style={{ color: '#6c757d', fontSize: '14px' }}>
            Total: {users.length} | Filtered: {filteredUsers.length}
          </span>
        </div>
        <button onClick={handleCreateUser} className="primary">
          + New User
        </button>
      </div>

      <div className="section-box">
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr className={styles.tableRow}>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                Username {sortField === 'username' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('user_type')} style={{ cursor: 'pointer' }}>
                Type {sortField === 'user_type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell} onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={styles.tableRow}>
                <td className={styles.tableCell}>{user.id}</td>
                <td className={styles.tableCell}>{user.username}</td>
                <td className={styles.tableCell}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}</td>
                <td className={styles.tableCell}>{user.email || 'N/A'}</td>
                <td className={styles.tableCell}>
                  <span className={`${styles.statusBadge} ${getUserTypeStatusClass(user.user_type)}`}>
                    {user.user_type}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <span className={`${styles.statusBadge} ${getUserStatusClass(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className={styles.tableCell}>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className={styles.tableCell}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => handleEdit(user)}
                      className="secondary"
                      title="Edit User"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(user)}
                      className="danger"
                      title="Delete User"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <UserEditModal
          user={editingUser}
          onSave={saveUser}
          onCancel={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <UserEditModal
          user={newUser}
          onSave={saveUser}
          onCancel={() => {
            setShowCreateModal(false);
            setNewUser({
              username: '',
              email: '',
              user_type: 'artist',
              status: 'draft',
              email_verified: 'no',
              onboarding_completed: 'no',
              meta_title: '',
              meta_description: '',
              google_uid: '',
              first_name: '',
              last_name: '',
              phone: '',
              address_line1: '',
              address_line2: '',
              city: '',
              state: '',
              postal_code: '',
              country: '',
              profile_image_path: '',
              header_image_path: '',
              display_name: '',
              website: '',
              social_facebook: '',
              social_instagram: '',
              social_tiktok: '',
              social_twitter: '',
              social_pinterest: '',
              social_whatsapp: '',
              birth_date: '',
              gender: '',
              nationality: '',
              languages_known: [],
              job_title: '',
              bio: '',
              education: [],
              awards: [],
              memberships: [],
              follows: [],
              timezone: '',
              preferred_currency: '',
              profile_visibility: 'public',
              art_categories: [],
              art_mediums: [],
              business_name: '',
              studio_address_line1: '',
              studio_address_line2: '',
              studio_city: '',
              studio_state: '',
              studio_zip: '',
              artist_biography: '',
              business_phone: '',
              business_website: '',
              business_social_facebook: '',
              business_social_instagram: '',
              business_social_tiktok: '',
              business_social_twitter: '',
              business_social_pinterest: '',
              does_custom: 'no',
              customer_service_email: '',
              legal_name: '',
              tax_id: '',
              founding_date: '',
              business_size: '',
              business_hours: [],
              price_range: '',
              payment_methods: [],
              service_area: [],
              logo_path: '',
              slogan: '',
              art_forms: [],
              art_style: '',
              art_genres: [],
              teaching_credentials: [],
              exhibitions: [],
              collections: [],
              commission_status: 'closed',
              publications: [],
              organization_name: '',
              organization_type: '',
              promoter_biography: '',
              events_managed: [],
              specialties: [],
              contact_person: '',
              contact_phone: '',
              contact_email: '',
              website_url: '',
              social_media_links: [],
              service_areas: [],
              years_experience: '',
              certifications: [],
              partnerships: [],
              community_name: '',
              community_type: '',
              community_description: '',
              member_count: '',
              founded_date: '',
              meeting_schedule: '',
              contact_info: '',
              social_links: [],
              activities: [],
              membership_requirements: '',
              admin_title: ''
            });
          }}
          isCreating={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="form-card" style={{ maxWidth: '400px', margin: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#dc3545' }}>Confirm Delete</h3>
            <p style={{ marginBottom: '10px' }}>Are you sure you want to delete user "{userToDelete.username}"?</p>
            <p style={{ marginBottom: '20px', color: '#6c757d' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="secondary"
              >
                Cancel
              </button>
              <button onClick={confirmDelete} className="danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Edit Modal Component
function UserEditModal({ user, onSave, onCancel, isCreating = false }) {
  const [formData, setFormData] = useState({ ...user });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayChange = (field, value) => {
    // Handle comma-separated values for array fields
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    handleChange(field, arrayValue);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.user_type) newErrors.user_type = 'User type is required';
    if (!formData.status) newErrors.status = 'Status is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const renderField = (label, field, type = 'text', required = false, options = null) => (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '5px', 
        fontWeight: '500', 
        color: '#495057' 
      }}>
        {label} {required && <span style={{ color: '#dc3545' }}>*</span>}
      </label>
      {type === 'select' && options ? (
        <select
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className={errors[field] ? 'form-input error' : 'form-input'}
          style={{ width: '100%' }}
        >
          <option value="">Select {label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className={errors[field] ? 'form-input error' : 'form-input'}
          style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
          rows={4}
        />
      ) : type === 'array' ? (
        <input
          type="text"
          value={Array.isArray(formData[field]) ? formData[field].join(', ') : ''}
          onChange={(e) => handleArrayChange(field, e.target.value)}
          className={errors[field] ? 'form-input error' : 'form-input'}
          style={{ width: '100%' }}
          placeholder="Comma-separated values"
        />
      ) : (
        <input
          type={type}
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className={errors[field] ? 'form-input error' : 'form-input'}
          style={{ width: '100%' }}
        />
      )}
      {errors[field] && (
        <span style={{ 
          color: '#dc3545', 
          fontSize: '12px', 
          marginTop: '4px', 
          display: 'block' 
        }}>
          {errors[field]}
        </span>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="form-card" style={{ 
        maxWidth: '90vw', 
        maxHeight: '90vh', 
        overflow: 'hidden',
        width: '800px'
      }}>
        <h3 style={{ marginBottom: '20px' }}>{isCreating ? 'Create New User' : 'Edit User'}</h3>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '2px solid #e9ecef',
          paddingBottom: '8px',
          overflowX: 'auto'
        }}>
          <button 
            className={activeTab === 'basic' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('basic')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Basic Info
          </button>
          <button 
            className={activeTab === 'profile' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('profile')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Profile
          </button>
          <button 
            className={activeTab === 'address' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('address')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Address
          </button>
          <button 
            className={activeTab === 'social' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('social')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Social Media
          </button>
          {formData.user_type === 'artist' && (
            <button 
              className={activeTab === 'artist' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('artist')}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Artist Details
            </button>
          )}
          {formData.user_type === 'promoter' && (
            <button 
              className={activeTab === 'promoter' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('promoter')}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Promoter Details
            </button>
          )}
          {formData.user_type === 'community' && (
            <button 
              className={activeTab === 'community' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('community')}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Community Details
            </button>
          )}
          {formData.user_type === 'admin' && (
            <button 
              className={activeTab === 'admin' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('admin')}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Admin Details
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div style={{ 
          maxHeight: '60vh', 
          overflowY: 'auto', 
          paddingRight: '8px',
          marginBottom: '20px'
        }}>
          {activeTab === 'basic' && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <h4 style={{ 
                margin: '0 0 15px 0', 
                color: '#495057',
                fontSize: '16px',
                borderBottom: '2px solid #495057',
                paddingBottom: '8px'
              }}>Basic Information</h4>
              {renderField('Username (Email)', 'username', 'text', true)}
              {renderField('User Type', 'user_type', 'select', true, [
                { value: 'artist', label: 'Artist' },
                { value: 'promoter', label: 'Promoter' },
                { value: 'community', label: 'Community' },
                { value: 'admin', label: 'Admin' }
              ])}
              {renderField('Status', 'status', 'select', true, [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'draft', label: 'Draft' }
              ])}
              {renderField('Email Verified', 'email_verified', 'select', false, [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ])}
              {renderField('Onboarding Completed', 'onboarding_completed', 'select', false, [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ])}
              {renderField('Meta Title', 'meta_title')}
              {renderField('Meta Description', 'meta_description', 'textarea')}
              {renderField('Google UID', 'google_uid')}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.formSection}>
              <h4>Profile Information</h4>
              {renderField('First Name', 'first_name')}
              {renderField('Last Name', 'last_name')}
              {renderField('Display Name', 'display_name')}
              {renderField('Phone', 'phone', 'tel')}
              {renderField('Job Title', 'job_title')}
              {renderField('Bio', 'bio', 'textarea')}
              {renderField('Birth Date', 'birth_date', 'date')}
              {renderField('Gender', 'gender', 'select', false, [
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Custom', label: 'Custom' },
                { value: 'Prefer Not to Say', label: 'Prefer Not to Say' }
              ])}
              {renderField('Nationality', 'nationality')}
              {renderField('Languages Known', 'languages_known', 'array')}
              {renderField('Education', 'education', 'textarea')}
              {renderField('Awards', 'awards', 'textarea')}
              {renderField('Memberships', 'memberships', 'textarea')}
              {renderField('Timezone', 'timezone')}
              {renderField('Profile Image Path', 'profile_image_path')}
              {renderField('Header Image Path', 'header_image_path')}
              {renderField('Website', 'website')}
            </div>
          )}

          {activeTab === 'address' && (
            <div className={styles.formSection}>
              <h4>Address Information</h4>
              {renderField('Address Line 1', 'address_line1')}
              {renderField('Address Line 2', 'address_line2')}
              {renderField('City', 'city')}
              {renderField('State', 'state')}
              {renderField('Postal Code', 'postal_code')}
              {renderField('Country', 'country')}
            </div>
          )}

          {activeTab === 'social' && (
            <div className={styles.formSection}>
              <h4>Social Media</h4>
              {renderField('Facebook', 'social_facebook')}
              {renderField('Instagram', 'social_instagram')}
              {renderField('TikTok', 'social_tiktok')}
              {renderField('Twitter', 'social_twitter')}
              {renderField('Pinterest', 'social_pinterest')}
              {renderField('WhatsApp', 'social_whatsapp')}
            </div>
          )}

          {activeTab === 'artist' && formData.user_type === 'artist' && (
            <div className={styles.formSection}>
              <h4>Artist Details</h4>
              {renderField('Business Name', 'business_name')}
              {renderField('Artist Biography', 'artist_biography', 'textarea')}
              {renderField('Art Categories', 'art_categories', 'array')}
              {renderField('Art Mediums', 'art_mediums', 'array')}
              {renderField('Does Custom Work', 'does_custom', 'select', false, [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ])}
              {renderField('Custom Details', 'custom_details', 'textarea')}
              <h5 style={{ marginTop: '20px', marginBottom: '10px', color: '#495057' }}>Business Information</h5>
              {renderField('Business Phone', 'business_phone', 'tel')}
              {renderField('Business Website', 'business_website')}
              {renderField('Customer Service Email', 'customer_service_email', 'email')}
              {renderField('Legal Name', 'legal_name')}
              {renderField('Tax ID', 'tax_id')}
              {renderField('Founding Date', 'founding_date', 'date')}
              {renderField('Logo Path', 'logo_path')}
              <h5 style={{ marginTop: '20px', marginBottom: '10px', color: '#495057' }}>Studio Address</h5>
              {renderField('Studio Address Line 1', 'studio_address_line1')}
              {renderField('Studio Address Line 2', 'studio_address_line2')}
              {renderField('Studio City', 'studio_city')}
              {renderField('Studio State', 'studio_state')}
              {renderField('Studio Zip', 'studio_zip')}
              <h5 style={{ marginTop: '20px', marginBottom: '10px', color: '#495057' }}>Business Social Media</h5>
              {renderField('Business Facebook', 'business_social_facebook')}
              {renderField('Business Instagram', 'business_social_instagram')}
              {renderField('Business TikTok', 'business_social_tiktok')}
              {renderField('Business Twitter', 'business_social_twitter')}
              {renderField('Business Pinterest', 'business_social_pinterest')}
            </div>
          )}

          {activeTab === 'promoter' && formData.user_type === 'promoter' && (
            <div className={styles.formSection}>
              <h4>Promoter Details</h4>
              {renderField('Business Name', 'business_name')}
              {renderField('Business Phone', 'business_phone', 'tel')}
              {renderField('Business Website', 'business_website')}
              {renderField('Is Non-Profit', 'is_non_profit', 'select', false, [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ])}
              {renderField('Legal Name', 'legal_name')}
              {renderField('Tax ID', 'tax_id')}
              {renderField('Founding Date', 'founding_date', 'date')}
              {renderField('Organization Size', 'organization_size')}
              {renderField('Logo Path', 'logo_path')}
              {renderField('Upcoming Events', 'upcoming_events', 'textarea')}
              {renderField('Sponsorship Options', 'sponsorship_options', 'textarea')}
              <h5 style={{ marginTop: '20px', marginBottom: '10px', color: '#495057' }}>Office Address</h5>
              {renderField('Office Address Line 1', 'office_address_line1')}
              {renderField('Office Address Line 2', 'office_address_line2')}
              {renderField('Office City', 'office_city')}
              {renderField('Office State', 'office_state')}
              {renderField('Office Zip', 'office_zip')}
              <h5 style={{ marginTop: '20px', marginBottom: '10px', color: '#495057' }}>Business Social Media</h5>
              {renderField('Business Facebook', 'business_social_facebook')}
              {renderField('Business Instagram', 'business_social_instagram')}
              {renderField('Business TikTok', 'business_social_tiktok')}
              {renderField('Business Twitter', 'business_social_twitter')}
              {renderField('Business Pinterest', 'business_social_pinterest')}
            </div>
          )}

          {activeTab === 'community' && formData.user_type === 'community' && (
            <div className={styles.formSection}>
              <h4>Community Details</h4>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
                Community profiles store art preferences and interests in JSON format.
              </p>
              {renderField('Art Style Preferences', 'art_style_preferences', 'textarea')}
              {renderField('Favorite Colors', 'favorite_colors', 'textarea')}
              {renderField('Art Interests', 'art_interests', 'textarea')}
              {renderField('Wishlist', 'wishlist', 'textarea')}
            </div>
          )}

          {activeTab === 'admin' && formData.user_type === 'admin' && (
            <div className={styles.formSection}>
              <h4>Admin Details</h4>
              {renderField('Title', 'title')}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid #e9ecef'
        }}>
          <button onClick={onCancel} className="secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="primary">
            {isCreating ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
} 
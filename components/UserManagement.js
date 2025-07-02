'use client';
import { useState, useEffect } from 'react';
import styles from './UserManagement.module.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    email: '',
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
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, sortField, sortDirection]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api2.onlineartfestival.com/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const handleEdit = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api2.onlineartfestival.com/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      const token = localStorage.getItem('token');
      const method = userData.id ? 'PUT' : 'POST';
      const url = userData.id 
        ? `https://api2.onlineartfestival.com/admin/users/${userData.id}`
        : 'https://api2.onlineartfestival.com/admin/users';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  if (loading) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>User Management</h2>
        <button onClick={handleCreateUser} className={styles.createButton}>
          + New User
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.stats}>
          <span>Total Users: {users.length}</span>
          <span>Filtered: {filteredUsers.length}</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className={styles.sortable}>
                ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('username')} className={styles.sortable}>
                Username {sortField === 'username' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('name')} className={styles.sortable}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('email')} className={styles.sortable}>
                Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('user_type')} className={styles.sortable}>
                Type {sortField === 'user_type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status')} className={styles.sortable}>
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('created_at')} className={styles.sortable}>
                Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}</td>
                <td>{user.email || 'N/A'}</td>
                <td>
                  <span className={`${styles.userType} ${styles[user.user_type]}`}>
                    {user.user_type}
                  </span>
                </td>
                <td>
                  <span className={`${styles.status} ${styles[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className={styles.actions}>
                    <button 
                      onClick={() => handleEdit(user)}
                      className={styles.editButton}
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(user)}
                      className={styles.deleteButton}
                      title="Delete User"
                    >
                      🗑️
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
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete user "{userToDelete.username}"?</p>
            <p>This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.deleteButton}>
                Delete
              </button>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
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
    <div className={styles.formRow}>
      <label>{label} {required && '*'}</label>
      {type === 'select' && options ? (
        <select
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className={errors[field] ? styles.errorInput : ''}
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
          className={errors[field] ? styles.errorInput : ''}
          rows={4}
        />
      ) : type === 'array' ? (
        <input
          type="text"
          value={Array.isArray(formData[field]) ? formData[field].join(', ') : ''}
          onChange={(e) => handleArrayChange(field, e.target.value)}
          className={errors[field] ? styles.errorInput : ''}
          placeholder="Comma-separated values"
        />
      ) : (
        <input
          type={type}
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className={errors[field] ? styles.errorInput : ''}
        />
      )}
      {errors[field] && <span className={styles.errorText}>{errors[field]}</span>}
    </div>
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.editModal}>
        <h3>{isCreating ? 'Create New User' : 'Edit User'}</h3>
        
        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'basic' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'address' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('address')}
          >
            Address
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'social' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('social')}
          >
            Social Media
          </button>
          {formData.user_type === 'artist' && (
            <button 
              className={`${styles.tabButton} ${activeTab === 'artist' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('artist')}
            >
              Artist Details
            </button>
          )}
          {formData.user_type === 'promoter' && (
            <button 
              className={`${styles.tabButton} ${activeTab === 'promoter' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('promoter')}
            >
              Promoter Details
            </button>
          )}
          {formData.user_type === 'community' && (
            <button 
              className={`${styles.tabButton} ${activeTab === 'community' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('community')}
            >
              Community Details
            </button>
          )}
          {formData.user_type === 'admin' && (
            <button 
              className={`${styles.tabButton} ${activeTab === 'admin' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Details
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'basic' && (
            <div className={styles.formSection}>
              <h4>Basic Information</h4>
              {renderField('Username', 'username', 'text', true)}
              {renderField('Email', 'email', 'email', true)}
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
              {renderField('Gender', 'gender')}
              {renderField('Nationality', 'nationality')}
              {renderField('Languages Known', 'languages_known', 'array')}
              {renderField('Education', 'education', 'array')}
              {renderField('Awards', 'awards', 'array')}
              {renderField('Memberships', 'memberships', 'array')}
              {renderField('Follows', 'follows', 'array')}
              {renderField('Timezone', 'timezone')}
              {renderField('Preferred Currency', 'preferred_currency')}
              {renderField('Profile Visibility', 'profile_visibility', 'select', false, [
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
                { value: 'connections_only', label: 'Connections Only' }
              ])}
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
              {renderField('Business Phone', 'business_phone')}
              {renderField('Business Website', 'business_website')}
              {renderField('Customer Service Email', 'customer_service_email')}
              {renderField('Legal Name', 'legal_name')}
              {renderField('Tax ID', 'tax_id')}
              {renderField('Art Categories', 'art_categories', 'array')}
              {renderField('Art Mediums', 'art_mediums', 'array')}
              {renderField('Art Forms', 'art_forms', 'array')}
              {renderField('Art Style', 'art_style')}
              {renderField('Art Genres', 'art_genres', 'array')}
              {renderField('Does Custom Work', 'does_custom', 'select', false, [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ])}
              {renderField('Commission Status', 'commission_status', 'select', false, [
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
                { value: 'waitlist', label: 'Waitlist' }
              ])}
              {renderField('Price Range', 'price_range')}
              {renderField('Business Size', 'business_size')}
              {renderField('Founding Date', 'founding_date', 'date')}
              {renderField('Slogan', 'slogan')}
              {renderField('Logo Path', 'logo_path')}
              {renderField('Studio Address Line 1', 'studio_address_line1')}
              {renderField('Studio Address Line 2', 'studio_address_line2')}
              {renderField('Studio City', 'studio_city')}
              {renderField('Studio State', 'studio_state')}
              {renderField('Studio Zip', 'studio_zip')}
              {renderField('Business Social Facebook', 'business_social_facebook')}
              {renderField('Business Social Instagram', 'business_social_instagram')}
              {renderField('Business Social TikTok', 'business_social_tiktok')}
              {renderField('Business Social Twitter', 'business_social_twitter')}
              {renderField('Business Social Pinterest', 'business_social_pinterest')}
              {renderField('Teaching Credentials', 'teaching_credentials', 'array')}
              {renderField('Exhibitions', 'exhibitions', 'array')}
              {renderField('Collections', 'collections', 'array')}
              {renderField('Publications', 'publications', 'array')}
              {renderField('Payment Methods', 'payment_methods', 'array')}
              {renderField('Service Area', 'service_area', 'array')}
              {renderField('Business Hours', 'business_hours', 'array')}
            </div>
          )}

          {activeTab === 'promoter' && formData.user_type === 'promoter' && (
            <div className={styles.formSection}>
              <h4>Promoter Details</h4>
              {renderField('Organization Name', 'organization_name')}
              {renderField('Organization Type', 'organization_type')}
              {renderField('Promoter Biography', 'promoter_biography', 'textarea')}
              {renderField('Contact Person', 'contact_person')}
              {renderField('Contact Phone', 'contact_phone')}
              {renderField('Contact Email', 'contact_email')}
              {renderField('Website URL', 'website_url')}
              {renderField('Years Experience', 'years_experience')}
              {renderField('Events Managed', 'events_managed', 'array')}
              {renderField('Specialties', 'specialties', 'array')}
              {renderField('Social Media Links', 'social_media_links', 'array')}
              {renderField('Service Areas', 'service_areas', 'array')}
              {renderField('Certifications', 'certifications', 'array')}
              {renderField('Partnerships', 'partnerships', 'array')}
            </div>
          )}

          {activeTab === 'community' && formData.user_type === 'community' && (
            <div className={styles.formSection}>
              <h4>Community Details</h4>
              {renderField('Community Name', 'community_name')}
              {renderField('Community Type', 'community_type')}
              {renderField('Community Description', 'community_description', 'textarea')}
              {renderField('Member Count', 'member_count')}
              {renderField('Founded Date', 'founded_date', 'date')}
              {renderField('Meeting Schedule', 'meeting_schedule')}
              {renderField('Contact Info', 'contact_info')}
              {renderField('Membership Requirements', 'membership_requirements')}
              {renderField('Social Links', 'social_links', 'array')}
              {renderField('Activities', 'activities', 'array')}
            </div>
          )}

          {activeTab === 'admin' && formData.user_type === 'admin' && (
            <div className={styles.formSection}>
              <h4>Admin Details</h4>
              {renderField('Admin Title', 'admin_title')}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button onClick={handleSave} className={styles.saveButton}>
            {isCreating ? 'Create User' : 'Save Changes'}
          </button>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 
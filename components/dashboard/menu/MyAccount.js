import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';
import EmailPreferences from '../../EmailPreferences';

import styles from '../../../pages/dashboard/Dashboard.module.css';
import slideInStyles from '../SlideIn.module.css';
import profileStyles from '../../../pages/profile/Profile.module.css';

// Available art categories for dropdown
const ART_CATEGORIES = [
  'Abstract', 'Acrylic Painting', 'Collage', 'Contemporary', 'Digital Art',
  'Drawing', 'Fiber Arts', 'Illustration', 'Jewelry', 'Mixed Media',
  'Oil Painting', 'Painting', 'Photography', 'Pottery', 'Printmaking',
  'Sculpture', 'Textiles', 'Watercolor', 'Wood Working'
];

// Available art mediums for dropdown
const ART_MEDIUMS = [
  'Acrylic', 'Oil', 'Watercolor', 'Pencil', 'Charcoal', 'Ink', 'Pastel',
  'Digital', 'Mixed Media', 'Collage', 'Photography', 'Sculpture', 'Ceramic',
  'Glass', 'Metal', 'Wood', 'Fabric', 'Paper', 'Stone', 'Resin'
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Custom', label: 'Custom' },
  { value: 'Prefer Not To Say', label: 'Prefer Not To Say' }
];

// Internal Profile View Component
function ProfileViewContent({ userId, onBack }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me', {
          method: 'GET'
        });
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <div className={slideInStyles.content}>
          <div className={slideInStyles.loading}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <div className={slideInStyles.content}>
          <div className={slideInStyles.error}>Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <div className={slideInStyles.content}>
          <div className={slideInStyles.error}>Profile not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h1 className={slideInStyles.title}>View Profile</h1>
      </div>
      
      <div className={slideInStyles.content}>
        <div className={profileStyles.container}>
          {/* Header Image */}
          {userProfile.header_image_path ? (
            <img
              src={`https://api2.onlineartfestival.com${userProfile.header_image_path}`}
              alt="Header"
              className={profileStyles.headerImage}
            />
          ) : (
            <div className={profileStyles.headerPlaceholder}></div>
          )}

          {/* Profile Section */}
          <div className={profileStyles.profileWrapper}>
            {userProfile.profile_image_path && (
              <img
                src={`https://api2.onlineartfestival.com${userProfile.profile_image_path}`}
                alt="Profile"
                className={profileStyles.profileImage}
              />
            )}
            <div className={profileStyles.socialIcons}>
              {userProfile.website && (
                <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className={profileStyles.websiteLink}>
                  <i className="fa-solid fa-globe"></i>
                </a>
              )}
              {userProfile.social_facebook && (
                <a href={userProfile.social_facebook} target="_blank" rel="noopener noreferrer" className={profileStyles.link}>
                  <i className="fa-brands fa-facebook-f"></i>
                </a>
              )}
              {userProfile.social_instagram && (
                <a href={userProfile.social_instagram} target="_blank" rel="noopener noreferrer" className={profileStyles.link}>
                  <i className="fa-brands fa-instagram"></i>
                </a>
              )}
              {userProfile.social_twitter && (
                <a href={userProfile.social_twitter} target="_blank" rel="noopener noreferrer" className={profileStyles.link}>
                  <i className="fa-brands fa-x-twitter"></i>
                </a>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className={profileStyles.infoCard}>
            <h2 className={profileStyles.userName}>
              {userProfile.display_name || `${userProfile.first_name} ${userProfile.last_name}`}
            </h2>
            {userProfile.display_name && (
              <p className={profileStyles.realName}>
                ({userProfile.first_name} {userProfile.last_name})
              </p>
            )}
            {userProfile.job_title && (
              <p className={profileStyles.jobTitle}>{userProfile.job_title}</p>
            )}
            {(userProfile.city || userProfile.state) && (
              <span className={profileStyles.stateBadge}>
                <i className="fas fa-map-marker-alt"></i>
                {userProfile.city && userProfile.state ? `${userProfile.city}, ${userProfile.state}` : userProfile.city || userProfile.state}
                {userProfile.country && `, ${userProfile.country}`}
              </span>
            )}
            {userProfile.bio && (
              <div className={profileStyles.bioQuote}>
                <p>{userProfile.bio}</p>
              </div>
            )}
          </div>

          {/* Personal Information Section */}
          <div className={profileStyles.section}>
            <h3>Personal Information</h3>
            <div className={profileStyles.infoGrid}>
              {userProfile.phone && (
                <div className={profileStyles.infoItem}>
                  <strong>Phone:</strong> {userProfile.phone}
                </div>
              )}
              {userProfile.birth_date && (
                <div className={profileStyles.infoItem}>
                  <strong>Birth Date:</strong> {new Date(userProfile.birth_date).toLocaleDateString()}
                </div>
              )}
              {userProfile.gender && (
                <div className={profileStyles.infoItem}>
                  <strong>Gender:</strong> {userProfile.gender}
                </div>
              )}
              {userProfile.nationality && (
                <div className={profileStyles.infoItem}>
                  <strong>Nationality:</strong> {userProfile.nationality}
                </div>
              )}
              {userProfile.education && (
                <div className={profileStyles.infoItem}>
                  <strong>Education:</strong> {userProfile.education}
                </div>
              )}
            </div>
          </div>

          {/* Artist Details (if applicable) */}
          {userProfile.user_type === 'artist' && (
            <div className={profileStyles.section}>
              <h3>Artist Details</h3>
              {userProfile.business_name && <p><strong>Business Name:</strong> {userProfile.business_name}</p>}
              {userProfile.artist_biography && <p><strong>Artist Biography:</strong> {userProfile.artist_biography}</p>}
              
              {userProfile.art_categories && Array.isArray(userProfile.art_categories) && userProfile.art_categories.length > 0 && (
                <p><strong>Art Categories:</strong> {userProfile.art_categories.join(', ')}</p>
              )}
              {userProfile.art_mediums && Array.isArray(userProfile.art_mediums) && userProfile.art_mediums.length > 0 && (
                <p><strong>Art Mediums:</strong> {userProfile.art_mediums.join(', ')}</p>
              )}
              
              <p><strong>Accepts Custom Orders:</strong> {userProfile.does_custom}</p>
              {userProfile.does_custom === 'yes' && userProfile.custom_details && (
                <p><strong>Custom Order Details:</strong> {userProfile.custom_details}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Internal Profile Edit Component
function ProfileEditContent({ userData, onBack, onSaved }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    bio: '',
    website: '',
    birth_date: '',
    gender: '',
    nationality: '',
    job_title: '',
    education: '',
    social_facebook: '',
    social_instagram: '',
    social_twitter: '',
    artist_biography: '',
    art_categories: [],
    art_mediums: [],
    does_custom: 'no',
    custom_details: '',
    business_name: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [headerImage, setHeaderImage] = useState(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        display_name: userData.display_name || '',
        phone: userData.phone || '',
        address_line1: userData.address_line1 || '',
        address_line2: userData.address_line2 || '',
        city: userData.city || '',
        state: userData.state || '',
        postal_code: userData.postal_code || '',
        country: userData.country || '',
        bio: userData.bio || '',
        website: userData.website || '',
        birth_date: userData.birth_date ? userData.birth_date.split('T')[0] : '',
        gender: userData.gender || '',
        nationality: userData.nationality || '',
        job_title: userData.job_title || '',
        education: userData.education || '',
        social_facebook: userData.social_facebook || '',
        social_instagram: userData.social_instagram || '',
        social_twitter: userData.social_twitter || '',
        artist_biography: userData.artist_biography || '',
        art_categories: userData.art_categories || [],
        art_mediums: userData.art_mediums || [],
        does_custom: userData.does_custom || 'no',
        custom_details: userData.custom_details || '',
        business_name: userData.business_name || ''
      });
    } else {
      setError('User data not available. Please try refreshing the page.');
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'art_categories' || name === 'art_mediums') {
        setFormData(prev => ({
          ...prev,
          [name]: checked
            ? [...prev[name], value]
            : prev[name].filter(item => item !== value)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file && file.size > maxSize) {
      setError(`File too large. Please choose an image smaller than 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      e.target.value = ''; // Clear the file input
      return;
    }
    
    if (name === 'profile_image') {
      setProfileImage(file);
    } else if (name === 'header_image') {
      setHeaderImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }
      if (headerImage) {
        formDataToSend.append('header_image', headerImage);
      }

      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me', {
        method: 'PATCH',
        body: formDataToSend
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const responseData = await res.json();
      
      // Show success message before closing
      alert('Profile updated successfully!');
      
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <div className={slideInStyles.content}>
          <div className={slideInStyles.loading}>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h1 className={slideInStyles.title}>Edit Profile</h1>
      </div>

      <div className={slideInStyles.content}>
        {error && (
          <div className="error-alert">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={slideInStyles.form}>
          {/* Basic Information */}
          <div className="section-box">
            <h3>Basic Information</h3>
            <div className={slideInStyles.formRow}>
              <div className={slideInStyles.formGroup}>
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className={slideInStyles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={slideInStyles.formRow}>
              <div className={slideInStyles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="How you'd like to be displayed publicly"
                />
              </div>
              <div className={slideInStyles.formGroup}>
                <label>Job Title</label>
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="Your job title or profession"
                />
              </div>
            </div>

            <div className={slideInStyles.formGroup}>
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="section-box">
            <h3>Contact Information</h3>
            <div className={slideInStyles.formRow}>
              <div className={slideInStyles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className={slideInStyles.formGroup}>
                <label>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="section-box">
            <h3>Profile Images</h3>
            <div className={slideInStyles.formRow}>
              <div className={slideInStyles.formGroup}>
                <label>Profile Image (Max 5MB)</label>
                <input
                  type="file"
                  name="profile_image"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className={slideInStyles.fileInput}
                />
                <small className={slideInStyles.helpText}>JPEG/PNG, max 5MB</small>
              </div>
              <div className={slideInStyles.formGroup}>
                <label>Header Image (Max 5MB)</label>
                <input
                  type="file"
                  name="header_image"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className={slideInStyles.fileInput}
                />
                <small className={slideInStyles.helpText}>JPEG/PNG, max 5MB</small>
              </div>
            </div>
          </div>

          {/* Artist Information (if applicable) */}
          {userData.user_type === 'artist' && (
            <div className="section-box">
              <h3>Artist Information</h3>
              <div className={slideInStyles.formGroup}>
                <label>Business Name</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                />
              </div>
              <div className={slideInStyles.formGroup}>
                <label>Artist Biography</label>
                <textarea
                  name="artist_biography"
                  value={formData.artist_biography}
                  onChange={handleChange}
                  placeholder="Tell us about your artistic journey"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={slideInStyles.actions}>
            <button
              type="button"
              onClick={onBack}
              className="secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className={slideInStyles.spinner}></div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Internal My Orders Component  
function MyOrdersContent({ userId, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/checkout/orders/my?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders);
          setTotalPages(data.pagination.pages);
        } else {
          setError('Failed to fetch orders');
        }
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'processing': return '#ffc107';
      case 'shipped': return '#17a2b8';
      case 'cancelled': return '#dc3545';
      case 'refunded': return '#6c757d';
      default: return '#007bff';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h1 className={slideInStyles.title}>My Orders</h1>
        </div>
        <div className={slideInStyles.content}>
          <div className={slideInStyles.loading}>Loading orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h1 className={slideInStyles.title}>My Orders</h1>
        </div>
        <div className={slideInStyles.content}>
          <div className="error-alert">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h1 className={slideInStyles.title}>My Orders</h1>
      </div>

      <div className={slideInStyles.content}>
        {/* Status Filter */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="status-filter" style={{ display: 'block', marginBottom: '5px' }}>Filter by Status:</label>
          <select 
            id="status-filter"
            value={statusFilter} 
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <p>No orders found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map((order) => (
              <div key={order.id} style={{ 
                border: '1px solid #e9ecef', 
                borderRadius: '8px', 
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div 
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer',
                    borderBottom: expandedOrders.has(order.id) ? '1px solid #e9ecef' : 'none'
                  }}
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        Order #{order.id}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span 
                        style={{ 
                          backgroundColor: getStatusColor(order.status),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        {order.status}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>
                      <span style={{ fontSize: '16px', color: '#6c757d' }}>
                        {expandedOrders.has(order.id) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Order Details */}
                {expandedOrders.has(order.id) && (
                  <div style={{ padding: '16px', backgroundColor: '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#055474' }}>Items in this order:</h4>
                    {order.items.map((item, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d' }}>
                            Sold by: {item.vendor_name}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6c757d' }}>
                            Quantity: {item.quantity} × {formatCurrency(item.price)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatCurrency(item.item_total)}
                        </div>
                      </div>
                    ))}

                    <div style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid #e9ecef',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        <div>Shipping: {formatCurrency(order.shipping_amount)}</div>
                        {order.tax_amount > 0 && <div>Tax: {formatCurrency(order.tax_amount)}</div>}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700' }}>
                        Total: {formatCurrency(order.total_amount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '16px',
            marginTop: '32px',
            paddingTop: '16px',
            borderTop: '1px solid #e9ecef'
          }}>
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="secondary"
            >
              Previous
            </button>
            
            <span style={{ color: '#6c757d' }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Menu Section Component
export function MyAccountMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {


  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections.account ? styles.collapsed : ''}`}
        onClick={() => toggleSection('account')}
      >
        <span className={styles.accountHeader}>
          My Account
        </span>
      </h3>
      {!collapsedSections.account && (
        <ul>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('profile-edit')}
            >
              Edit Profile
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('profile-view')}
            >
              View Profile
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('my-orders')}
            >
              My Orders
            </button>
          </li>
          <li>
            <button 
              className={styles.sidebarLink}
              onClick={() => openSlideIn('email-settings')}
            >
              Email Settings
            </button>
          </li>

        </ul>
      )}
    </div>
  );
}

// Slide-in Content Renderer
export function MyAccountSlideIn({ 
  slideInContent, 
  userData, 
  closeSlideIn 
}) {
  if (!slideInContent || !userData) return null;

  switch (slideInContent.type) {
    case 'profile-view':
      return <ProfileViewContent userId={userData.id} onBack={closeSlideIn} />;
    case 'profile-edit':
      return <ProfileEditContent 
        userData={userData}
        onBack={closeSlideIn} 
        onSaved={() => {
          closeSlideIn();
          // Optionally refresh user data
        }} 
      />;
    case 'my-orders':
      return <MyOrdersContent userId={userData.id} onBack={closeSlideIn} />;
    case 'email-settings':
      return (
        <div className={slideInStyles.container}>
          <div className={slideInStyles.header}>
            <button onClick={closeSlideIn} className={slideInStyles.backButton}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
          </div>
          <div className={slideInStyles.content}>
            <EmailPreferences userId={userData.id} />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Helper to check if this menu handles a slide-in type
export const myAccountSlideInTypes = ['profile-view', 'profile-edit', 'my-orders', 'email-settings'];

// Default export for backward compatibility
export default MyAccountMenu; 
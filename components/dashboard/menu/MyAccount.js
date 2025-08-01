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
          <div className="loading-state">Loading profile...</div>
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
          <div className="error-alert">Error: {error}</div>
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
          <div className="error-alert">Profile not found</div>
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
          <div className="loading-state">Loading profile...</div>
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

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="section-box">
            <h3>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="How you'd like to be displayed publicly"
                />
              </div>
              <div>
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

            <div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label>Profile Image (Max 5MB)</label>
                <input
                  type="file"
                  name="profile_image"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                />
                <small className={slideInStyles.helpText}>JPEG/PNG, max 5MB</small>
              </div>
              <div>
                <label>Header Image (Max 5MB)</label>
                <input
                  type="file"
                  name="header_image"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                />
                <small className={slideInStyles.helpText}>JPEG/PNG, max 5MB</small>
              </div>
            </div>
          </div>

          {/* Artist Information (if applicable) */}
          {userData.user_type === 'artist' && (
            <div className="section-box">
              <h3>Artist Information</h3>
              <div>
                <label>Business Name</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                />
              </div>
              <div>
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
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #e9ecef', marginTop: '32px' }}>
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
                  <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid currentColor', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
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
          <div className="loading-state">Loading orders...</div>
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

// Payment Management Component
function PaymentManagementContent({ userData, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendorSettings, setVendorSettings] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);

  useEffect(() => {
    fetchVendorSettings();
  }, []);

  const fetchVendorSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/settings', {
        method: 'GET'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch payment settings');
      }
      
      const data = await res.json();
      setVendorSettings(data.settings);
    } catch (err) {
      setError('Unable to load payment settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/stripe-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create Stripe account');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.stripe_account.onboarding_url;
    } catch (err) {
      setError('Unable to connect Stripe account. Please try again.');
      setActionLoading(false);
    }
  };

  const handleContinueSetup = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/stripe-onboarding', {
        method: 'GET'
      });
      
      if (!res.ok) {
        throw new Error('Failed to get onboarding link');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.onboarding_url;
    } catch (err) {
      setError('Unable to continue setup. Please try again.');
      setActionLoading(false);
    }
  };

  const handlePaymentPreferenceChange = async (useConnectBalance) => {
    try {
      setUpdatingPreferences(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/subscription-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
          reverse_transfer_enabled: useConnectBalance
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }
      
      // Update local state
      setVendorSettings(prev => ({
        ...prev,
        subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
        reverse_transfer_enabled: useConnectBalance
      }));
      
    } catch (err) {
      setError('Unable to update payment preferences. Please try again.');
    } finally {
      setUpdatingPreferences(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAccountStatus = () => {
    if (!vendorSettings?.stripe_account_id) {
      return { status: 'no-account', label: 'Not Connected', color: '#6c757d' };
    }
    if (!vendorSettings?.stripe_account_verified) {
      return { status: 'pending', label: 'Setup Required', color: 'var(--warning-color)' };
    }
    return { status: 'verified', label: 'Connected & Verified', color: 'var(--success-color)' };
  };

  const renderAccountStatus = () => {
    const accountStatus = getAccountStatus();
    
    return (
      <div className="section-box">
        <h3>Account Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: accountStatus.color 
            }}
          ></div>
          <span style={{ fontWeight: '500', fontSize: '16px' }}>
            {accountStatus.label}
          </span>
        </div>
        
        {vendorSettings?.stripe_account_id && (
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
            Account: {vendorSettings.stripe_account_id.substring(0, 12)}...
          </div>
        )}
      </div>
    );
  };

  const renderBalanceSection = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Balance & Earnings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Available</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.available_balance)}
            </div>
          </div>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Pending</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.pending_balance)}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Next Payout</div>
          <div style={{ fontSize: '14px' }}>
            {vendorSettings?.next_payout_date 
              ? `${formatDate(vendorSettings.next_payout_date)} • ${formatCurrency(vendorSettings.next_payout_amount)}`
              : 'No pending payouts'
            }
          </div>
        </div>
      </div>
    );
  };

  const renderPayoutSettings = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Payout Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Schedule</div>
            <div style={{ fontSize: '16px' }}>
              Every {vendorSettings?.payout_days || 15} days
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Commission Rate</div>
            <div style={{ fontSize: '16px' }}>
              {vendorSettings?.commission_rate || 15}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentPreferences = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    const useConnectBalance = vendorSettings?.subscription_payment_method === 'balance_first';
    
    return (
      <div className="section-box">
        <h3>Payment Preferences</h3>
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: updatingPreferences ? 0.6 : 1 }}>
            <input 
              type="checkbox"
              checked={useConnectBalance}
              onChange={(e) => handlePaymentPreferenceChange(e.target.checked)}
              disabled={updatingPreferences}
              style={{ marginTop: '2px', transform: 'scale(1.1)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                Use Connect balance for subscriptions
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {useConnectBalance 
                  ? 'Platform subscriptions will be paid from your Connect earnings first, then your card if needed.'
                  : 'Platform subscriptions will always be charged to your card.'
                }
              </div>
              {updatingPreferences && (
                <div style={{ fontSize: '12px', color: '#055474', marginTop: '4px' }}>
                  Updating preferences...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const accountStatus = getAccountStatus();
    
    if (accountStatus.status === 'no-account') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '16px', marginBottom: '16px', color: '#6c757d' }}>
              Connect your Stripe account to start receiving payments from your sales and services.
            </div>
            <button 
              onClick={handleConnectStripe}
              disabled={actionLoading}
            >
              {actionLoading ? 'Connecting...' : 'Connect Stripe Account'}
            </button>
            <div style={{ fontSize: '12px', color: '#8d8d8d', marginTop: '12px' }}>
              This process takes 2-3 minutes
            </div>
          </div>
        </div>
      );
    }
    
    if (accountStatus.status === 'pending') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="warning-alert">
              Your Stripe account needs additional information to start processing payments.
            </div>
            <button 
              onClick={handleContinueSetup}
              disabled={actionLoading}
              style={{ backgroundColor: 'var(--warning-color)' }}
            >
              {actionLoading ? 'Loading...' : 'Continue Setup'}
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="section-box">
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            onClick={handleContinueSetup}
            className="secondary"
          >
            Update Banking Info
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a 
            href={`https://dashboard.stripe.com/express/accounts/${vendorSettings?.stripe_account_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              fontSize: '11px', 
              color: '#8d8d8d', 
              textDecoration: 'none',
              borderBottom: '1px dotted #8d8d8d'
            }}
          >
            Click here to visit your stripe.com account
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2 className={slideInStyles.title}>Payment Management</h2>
        </div>
        <div className={slideInStyles.content}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '16px', color: '#6c757d' }}>Loading payment settings...</div>
          </div>
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
        <h2 className={slideInStyles.title}>Payment Management</h2>
      </div>
      <div className={slideInStyles.content}>
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: '24px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}
        
        {renderAccountStatus()}
        {renderBalanceSection()}
        {renderPayoutSettings()}
        {renderPaymentPreferences()}
        {renderActionButtons()}
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
          {(userData.permissions?.includes('stripe_connect') || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('payment-management')}
              >
                Payment Management
              </button>
            </li>
          )}

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
    case 'payment-management':
      return <PaymentManagementContent 
        userData={userData} 
        onBack={closeSlideIn} 
      />;

    default:
      return null;
  }
}

// Helper to check if this menu handles a slide-in type
export const myAccountSlideInTypes = ['profile-view', 'profile-edit', 'my-orders', 'email-settings', 'payment-management'];

// Default export for backward compatibility
export default MyAccountMenu; 
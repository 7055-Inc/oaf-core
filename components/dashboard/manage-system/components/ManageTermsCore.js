import React, { useState, useEffect } from 'react';
import WYSIWYGEditor from '../../../WYSIWYGEditor';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import styles from '../../SlideIn.module.css';

const ManageTermsCore = () => {
  const [termsVersions, setTermsVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit', 'stats'
  const [selectedTerms, setSelectedTerms] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(null);

  // Form state for terms creation/editing
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    setCurrent: false
  });

  // Load terms versions on component mount
  useEffect(() => {
    loadTermsVersions();
  }, []);

  // Load terms versions from API
  const loadTermsVersions = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/terms/all');
      if (!response.ok) {
        throw new Error(`Failed to load terms versions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTermsVersions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setTermsVersions([]);
      console.error('Error loading terms versions:', err);
    } finally {
      setLoading(false);
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

  // Handle content change from WYSIWYG editor
  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content: content
    }));
  };

  // Handle terms creation
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate required fields
    if (!formData.version || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/terms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create terms version');
      }

      const newTerms = await response.json();
      setSuccess(`Terms version ${formData.version} created successfully!${formData.setCurrent ? ' Users will now be required to accept the new terms.' : ''}`);
      loadTermsVersions(); // Reload the list
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error creating terms:', err);
    }
  };

  // Handle terms update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/terms/${selectedTerms.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update terms version');
      }

      setSuccess(`Terms version updated successfully!${formData.setCurrent ? ' Users will now be required to accept the updated terms.' : ''}`);
      loadTermsVersions(); // Reload the list
      resetForm();
      setActiveView('list');
    } catch (err) {
      setError(err.message);
      console.error('Error updating terms:', err);
    }
  };

  // Handle setting terms as current
  const handleSetCurrent = async (termsId) => {
    if (!window.confirm('Are you sure you want to set this version as current? All users will be required to accept the new terms.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/terms/${termsId}/set-current`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set terms as current');
      }

      setSuccess('Terms version set as current successfully! All users will now be required to accept these terms.');
      loadTermsVersions(); // Reload the list
    } catch (err) {
      setError(err.message);
      console.error('Error setting current terms:', err);
    }
  };

  // Handle terms deletion
  const handleDelete = async (termsId) => {
    if (!window.confirm('Are you sure you want to delete this terms version? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/terms/${termsId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete terms version');
      }

      setSuccess('Terms version deleted successfully!');
      loadTermsVersions(); // Reload the list
    } catch (err) {
      setError(err.message);
      console.error('Error deleting terms:', err);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      version: '',
      title: '',
      content: '',
      setCurrent: false
    });
    setSelectedTerms(null);
    setError(null);
    setSuccess(null);
  };

  // Start editing a terms version
  const startEdit = (terms) => {
    setSelectedTerms(terms);
    setFormData({
      version: terms.version,
      title: terms.title,
      content: terms.content,
      setCurrent: terms.is_current
    });
    setActiveView('edit');
    setError(null);
    setSuccess(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter terms versions based on search
  const filteredTerms = termsVersions.filter(terms =>
    terms.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terms.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get terms stats
  const termsStats = {
    total: termsVersions.length,
    current: termsVersions.filter(t => t.is_current).length,
    drafts: termsVersions.filter(t => !t.is_current).length
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading terms versions...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
          Create and manage terms and conditions versions. Setting a version as current will automatically require all users to accept the new terms.
        </p>
      </div>

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <button
          className={activeView === 'list' ? 'primary' : 'secondary'}
          onClick={() => setActiveView('list')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          All Terms Versions ({termsVersions.length})
        </button>
        <button
          className={activeView === 'create' ? 'primary' : 'secondary'}
          onClick={() => {
            resetForm();
            setActiveView('create');
          }}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Create New Version
        </button>
        <button
          className={activeView === 'stats' ? 'primary' : 'secondary'}
          onClick={() => setActiveView('stats')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Statistics
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="success-alert" style={{ marginBottom: '20px' }}>
          {success}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Content */}
      {activeView === 'list' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search terms versions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredTerms.map(terms => (
              <div key={terms.id} className="form-card">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '15px' 
                }}>
                  <h3 style={{ color: '#495057', fontSize: '18px', fontWeight: '600', margin: 0, flex: 1 }}>
                    {terms.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ 
                      backgroundColor: '#f8f9fa',
                      color: '#495057',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      v{terms.version}
                    </span>
                    {terms.is_current && (
                      <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>
                        Current
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    padding: '15px',
                    borderLeft: '4px solid #055474'
                  }}>
                    <div 
                      style={{ 
                        color: '#495057',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        margin: 0
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: terms.content.substring(0, 200) + (terms.content.length > 200 ? '...' : '')
                      }}
                    />
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>
                      Created: {formatDate(terms.created_at)}
                    </span>
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>
                      By: {terms.created_by_name || 'Admin'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => startEdit(terms)}
                      className="primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    {!terms.is_current && (
                      <button
                        onClick={() => handleSetCurrent(terms.id)}
                        className="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Set as Current
                      </button>
                    )}
                    {!terms.is_current && (
                      <button
                        onClick={() => handleDelete(terms.id)}
                        className="danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTerms.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: '#6c757d' 
            }}>
              <h3 style={{ 
                color: '#495057', 
                fontSize: '24px', 
                fontWeight: '600', 
                margin: '0 0 10px 0' 
              }}>
                No terms versions found
              </h3>
              <p style={{ fontSize: '16px', margin: '0 0 30px 0' }}>
                Get started by creating your first terms and conditions version.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setActiveView('create');
                }}
                className="primary"
              >
                Create First Version
              </button>
            </div>
          )}
        </div>
      )}

      {activeView === 'stats' && (
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div className="form-card" style={{ textAlign: 'center' }}>
              <span style={{ 
                display: 'block', 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#495057', 
                marginBottom: '8px' 
              }}>
                {termsStats.total}
              </span>
              <span style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#6c757d', 
                fontWeight: '500', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Total Versions
              </span>
            </div>
            <div className="form-card" style={{ textAlign: 'center' }}>
              <span style={{ 
                display: 'block', 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#495057', 
                marginBottom: '8px' 
              }}>
                {termsStats.current}
              </span>
              <span style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#6c757d', 
                fontWeight: '500', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Current Version
              </span>
            </div>
            <div className="form-card" style={{ textAlign: 'center' }}>
              <span style={{ 
                display: 'block', 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#495057', 
                marginBottom: '8px' 
              }}>
                {termsStats.drafts}
              </span>
              <span style={{ 
                display: 'block', 
                fontSize: '14px', 
                color: '#6c757d', 
                fontWeight: '500', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Draft Versions
              </span>
            </div>
          </div>

          <div className="section-box">
            <h3 style={{ 
              color: '#495057', 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 15px 0' 
            }}>
              Recent Versions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {termsVersions.slice(0, 5).map(terms => (
                <div key={terms.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '15px', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  backgroundColor: '#f8f9fa' 
                }}>
                  <div style={{ fontSize: '16px', flexShrink: 0 }}>
                    {terms.is_current ? '✅' : '📝'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: '#495057', 
                      fontWeight: '500', 
                      fontSize: '14px' 
                    }}>
                      {terms.title}
                    </div>
                    <div style={{ 
                      color: '#6c757d', 
                      fontSize: '12px', 
                      marginTop: '2px' 
                    }}>
                      Version {terms.version} • {formatDate(terms.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeView === 'create' || activeView === 'edit') && (
        <div>
          <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
            {/* Basic Information */}
            <div className="form-card" style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                color: '#495057', 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 20px 0' 
              }}>
                Terms Information
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: '500', 
                    color: '#495057', 
                    fontSize: '14px' 
                  }}>
                    Version *
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="e.g., 2.1, 3.0, etc."
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: '500', 
                    color: '#495057', 
                    fontSize: '14px' 
                  }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="e.g., Terms and Conditions v2.1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  color: '#495057' 
                }}>
                  <input
                    type="checkbox"
                    name="setCurrent"
                    checked={formData.setCurrent}
                    onChange={handleInputChange}
                    style={{ margin: 0, cursor: 'pointer' }}
                  />
                  Set as current version (will require all users to accept)
                </label>
              </div>
            </div>

            {/* Content Editor */}
            <div className="form-card" style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                color: '#495057', 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 20px 0' 
              }}>
                Terms Content
              </h3>
              <WYSIWYGEditor
                value={formData.content}
                onChange={handleContentChange}
                title="Terms and Conditions Content"
                height={600}
                placeholder="Enter your terms and conditions content here..."
                allowImageUpload={false}
              />
            </div>

            {/* Form Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              borderTop: '1px solid #e9ecef' 
            }}>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveView('list');
                }}
                className="secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
              >
                {activeView === 'create' ? 'Create Terms Version' : 'Update Terms Version'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageTermsCore; 
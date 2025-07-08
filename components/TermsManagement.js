import React, { useState, useEffect } from 'react';
import WYSIWYGEditor from './WYSIWYGEditor';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './TermsManagement.module.css';

const TermsManagement = () => {
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
      <div className={styles.container}>
        <div className={styles.loading}>Loading terms versions...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Terms & Conditions Management</h2>
        <p>Create and manage terms and conditions versions. Setting a version as current will automatically require all users to accept the new terms.</p>
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <button
          className={`${styles.navButton} ${activeView === 'list' ? styles.active : ''}`}
          onClick={() => setActiveView('list')}
        >
          All Terms Versions ({termsVersions.length})
        </button>
        <button
          className={`${styles.navButton} ${activeView === 'create' ? styles.active : ''}`}
          onClick={() => {
            resetForm();
            setActiveView('create');
          }}
        >
          Create New Version
        </button>
        <button
          className={`${styles.navButton} ${activeView === 'stats' ? styles.active : ''}`}
          onClick={() => setActiveView('stats')}
        >
          Statistics
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className={styles.successMessage}>
          {success}
        </div>
      )}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Content */}
      {activeView === 'list' && (
        <div className={styles.content}>
          <div className={styles.filterSection}>
            <input
              type="text"
              placeholder="Search terms versions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.termsGrid}>
            {filteredTerms.map(terms => (
              <div key={terms.id} className={styles.termsCard}>
                <div className={styles.termsHeader}>
                  <h3>{terms.title}</h3>
                  <div className={styles.versionInfo}>
                    <span className={styles.version}>v{terms.version}</span>
                    {terms.is_current && <span className={styles.currentBadge}>Current</span>}
                  </div>
                </div>
                
                <div className={styles.termsContent}>
                  <div className={styles.contentPreview}>
                    <div 
                      className={styles.previewText}
                      dangerouslySetInnerHTML={{ 
                        __html: terms.content.substring(0, 200) + (terms.content.length > 200 ? '...' : '')
                      }}
                    />
                  </div>
                </div>

                <div className={styles.termsFooter}>
                  <div className={styles.termsInfo}>
                    <span className={styles.date}>Created: {formatDate(terms.created_at)}</span>
                    <span className={styles.author}>By: {terms.created_by_name || 'Admin'}</span>
                  </div>
                  
                  <div className={styles.termsActions}>
                    <button
                      onClick={() => startEdit(terms)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    {!terms.is_current && (
                      <button
                        onClick={() => handleSetCurrent(terms.id)}
                        className={styles.publishButton}
                      >
                        Set as Current
                      </button>
                    )}
                    {!terms.is_current && (
                      <button
                        onClick={() => handleDelete(terms.id)}
                        className={styles.deleteButton}
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
            <div className={styles.emptyState}>
              <h3>No terms versions found</h3>
              <p>Get started by creating your first terms and conditions version.</p>
              <button
                onClick={() => {
                  resetForm();
                  setActiveView('create');
                }}
                className={styles.primaryButton}
              >
                Create First Version
              </button>
            </div>
          )}
        </div>
      )}

      {activeView === 'stats' && (
        <div className={styles.content}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{termsStats.total}</span>
              <span className={styles.statLabel}>Total Versions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{termsStats.current}</span>
              <span className={styles.statLabel}>Current Version</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{termsStats.drafts}</span>
              <span className={styles.statLabel}>Draft Versions</span>
            </div>
          </div>

          <div className={styles.recentActivity}>
            <h3>Recent Versions</h3>
            <div className={styles.activityList}>
              {termsVersions.slice(0, 5).map(terms => (
                <div key={terms.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {terms.is_current ? '✅' : '📝'}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{terms.title}</div>
                    <div className={styles.activityMeta}>
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
        <div className={styles.content}>
          <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
            {/* Basic Information */}
            <div className={styles.formSection}>
              <h3>Terms Information</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Version *</label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    required
                    className={styles.formInput}
                    placeholder="e.g., 2.1, 3.0, etc."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className={styles.formInput}
                    placeholder="e.g., Terms and Conditions v2.1"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="setCurrent"
                    checked={formData.setCurrent}
                    onChange={handleInputChange}
                  />
                  Set as current version (will require all users to accept)
                </label>
              </div>
            </div>

            {/* Content Editor */}
            <div className={styles.formSection}>
              <h3>Terms Content</h3>
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
                {activeView === 'create' ? 'Create Terms Version' : 'Update Terms Version'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TermsManagement; 
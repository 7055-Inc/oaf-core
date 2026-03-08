/**
 * Terms Core Component
 * Admin interface for managing terms and conditions versions + policies
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  getAllTerms, 
  getTermsStats, 
  createTerms, 
  updateTerms, 
  setCurrentTerms, 
  deleteTerms 
} from '../../../../lib/system/api';
import PoliciesTab from './PoliciesTab';

// Dynamic import for BlockEditor to avoid SSR issues
const BlockEditor = dynamic(() => import('../../../shared/block-editor'), { 
  ssr: false,
  loading: () => <div className="loading-state"><div className="spinner"></div><span>Loading editor...</span></div>
});

export default function TermsCore() {
  // Main tab (terms vs policies)
  const [mainTab, setMainTab] = useState('terms');
  
  const [termsVersions, setTermsVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeView, setActiveView] = useState('list');
  const [selectedTerms, setSelectedTerms] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    setCurrent: false
  });

  useEffect(() => {
    if (mainTab === 'terms') {
      loadData();
    }
  }, [mainTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [termsResult, statsResult] = await Promise.all([
        getAllTerms(),
        getTermsStats()
      ]);
      
      if (termsResult.success) {
        setTermsVersions(termsResult.data);
      }
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentChange = (content) => {
    const contentToStore = typeof content === 'object' ? JSON.stringify(content) : content;
    setFormData(prev => ({ ...prev, content: contentToStore }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.version || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await createTerms(formData);
      setSuccess(`Terms version ${formData.version} created successfully!${formData.setCurrent ? ' Users will now be required to accept the new terms.' : ''}`);
      loadData();
      resetForm();
      setActiveView('list');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.version || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await updateTerms(selectedTerms.id, formData);
      setSuccess(`Terms version updated successfully!${formData.setCurrent ? ' Users will now be required to accept the updated terms.' : ''}`);
      loadData();
      resetForm();
      setActiveView('list');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (termsId) => {
    if (!confirm('Are you sure you want to set this version as current? All users will be required to accept the new terms.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await setCurrentTerms(termsId);
      setSuccess('Terms version set as current successfully! All users will now be required to accept these terms.');
      loadData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (termsId) => {
    if (!confirm('Are you sure you want to delete this terms version? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await deleteTerms(termsId);
      setSuccess('Terms version deleted successfully!');
      loadData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ version: '', title: '', content: '', setCurrent: false });
    setSelectedTerms(null);
    setError(null);
  };

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTerms = termsVersions.filter(terms =>
    terms.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terms.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading terms versions...</span>
      </div>
    );
  }

  return (
    <div className="terms-core">
      <div className="section-header">
        <div>
          <h2>Terms & Policies</h2>
          <p className="text-muted">
            Manage terms and conditions versions and site-wide policies.
          </p>
        </div>
      </div>

      {/* Main Tabs: Terms vs Policies */}
      <div className="main-tabs">
        <button
          className={`main-tab-btn ${mainTab === 'terms' ? 'active' : ''}`}
          onClick={() => setMainTab('terms')}
        >
          Terms & Conditions
        </button>
        <button
          className={`main-tab-btn ${mainTab === 'policies' ? 'active' : ''}`}
          onClick={() => setMainTab('policies')}
        >
          Site Policies
        </button>
      </div>

      {/* Policies Tab Content */}
      {mainTab === 'policies' && <PoliciesTab />}

      {/* Terms Tab Content */}
      {mainTab === 'terms' && (
        <>
          {/* Sub-navigation Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
            >
              All Versions ({termsVersions.length})
            </button>
            <button
              className={`tab-btn ${activeView === 'create' ? 'active' : ''}`}
              onClick={() => { resetForm(); setActiveView('create'); }}
            >
              Create New
            </button>
            <button
              className={`tab-btn ${activeView === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveView('stats')}
            >
              Statistics
            </button>
          </div>

      {/* Messages */}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* List View */}
      {activeView === 'list' && (
        <div>
          <div className="filter-bar">
            <input
              type="text"
              className="form-input"
              placeholder="Search terms versions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div className="card-grid">
            {filteredTerms.map(terms => (
              <div key={terms.id} className="form-card">
                <div className="card-header">
                  <h3>{terms.title}</h3>
                  <div className="badge-group">
                    <span className="badge badge-light">v{terms.version}</span>
                    {terms.is_current && (
                      <span className="badge badge-success">Current</span>
                    )}
                  </div>
                </div>
                
                <div className="card-preview">
                  <div 
                    className="preview-content"
                    dangerouslySetInnerHTML={{ 
                      __html: terms.content.substring(0, 200) + (terms.content.length > 200 ? '...' : '')
                    }}
                  />
                </div>

                <div className="card-footer">
                  <div className="card-meta">
                    <span>Created: {formatDate(terms.created_at)}</span>
                    <span>By: {terms.created_by_name || 'Admin'}</span>
                  </div>
                  
                  <div className="btn-group">
                    <button className="btn btn-primary btn-sm" onClick={() => startEdit(terms)}>
                      Edit
                    </button>
                    {!terms.is_current && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleSetCurrent(terms.id)}>
                          Set Current
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(terms.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTerms.length === 0 && (
            <div className="empty-state">
              <h3>No terms versions found</h3>
              <p>Get started by creating your first terms and conditions version.</p>
              <button className="btn btn-primary" onClick={() => { resetForm(); setActiveView('create'); }}>
                Create First Version
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats View */}
      {activeView === 'stats' && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Versions</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.current}</span>
              <span className="stat-label">Current Version</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.drafts}</span>
              <span className="stat-label">Draft Versions</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.acceptedUsers}</span>
              <span className="stat-label">Users Accepted</span>
            </div>
          </div>

          <div className="section">
            <h4>Recent Versions</h4>
            <div className="list-items">
              {termsVersions.slice(0, 5).map(terms => (
                <div key={terms.id} className="list-item">
                  <span className="list-icon">{terms.is_current ? '✅' : '📝'}</span>
                  <div className="list-content">
                    <strong>{terms.title}</strong>
                    <span className="text-muted">Version {terms.version} • {formatDate(terms.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(activeView === 'create' || activeView === 'edit') && (
        <form onSubmit={activeView === 'create' ? handleCreate : handleUpdate}>
          <div className="form-card">
            <h3>Terms Information</h3>
            
            <div className="form-row">
              <div className="form-group half">
                <label>Version *</label>
                <input
                  type="text"
                  name="version"
                  className="form-input"
                  value={formData.version}
                  onChange={handleInputChange}
                  placeholder="e.g., 2.1, 3.0"
                  required
                />
              </div>
              <div className="form-group half">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Terms and Conditions v2.1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
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

          <div className="form-card">
            <h3>Terms Content</h3>
            <BlockEditor
              value={formData.content}
              onChange={handleContentChange}
              minHeight={500}
              placeholder="Enter your terms and conditions content here..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { resetForm(); setActiveView('list'); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (activeView === 'create' ? 'Create Terms Version' : 'Update Terms Version')}
            </button>
          </div>
        </form>
      )}
        </>
      )}

      <style jsx>{`
        .terms-core {
          max-width: 1200px;
        }
        
        .main-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #dee2e6;
        }
        
        .main-tab-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          font-size: 1rem;
          font-weight: 500;
          color: #6c757d;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }
        
        .main-tab-btn:hover {
          color: #333;
        }
        
        .main-tab-btn.active {
          color: #055474;
          border-bottom-color: #055474;
        }
        
        .filter-bar {
          margin-bottom: 1.5rem;
        }
        
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        
        .card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          flex: 1;
        }
        
        .badge-group {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
          margin-left: 1rem;
        }
        
        .card-preview {
          background: #f8f9fa;
          border-radius: 4px;
          padding: 1rem;
          border-left: 4px solid #055474;
          margin-bottom: 1rem;
        }
        
        .preview-content {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #495057;
          overflow: hidden;
        }
        
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e9ecef;
        }
        
        .card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: #6c757d;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }
        
        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: #333;
        }
        
        .stat-label {
          display: block;
          font-size: 0.85rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.25rem;
        }
        
        .list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        .list-icon {
          font-size: 1.25rem;
        }
        
        .list-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .list-content strong {
          font-size: 0.95rem;
        }
        
        .list-content span {
          font-size: 0.8rem;
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
        }
        
        .form-group.half {
          flex: 1;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        
        .form-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          margin-top: 1rem;
        }
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.85rem;
        }
        
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6c757d;
        }
        
        .empty-state h3 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        
        .empty-state p {
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}

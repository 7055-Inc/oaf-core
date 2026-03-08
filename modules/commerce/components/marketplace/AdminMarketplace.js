/**
 * Admin Applications Component
 * 
 * Admin interface for reviewing and approving Marketplace, Verified, AND Wholesale applications.
 * Uses v2 API patterns and global styles.
 * Top-level tabs switch between application types.
 */

import { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AdminMarketplace({ userData, defaultType = 'marketplace' }) {
  // Top-level: which application type (marketplace, verified, or wholesale)
  const [applicationType, setApplicationType] = useState(defaultType);
  // Second-level: status filter
  const [statusTab, setStatusTab] = useState('pending');
  const [applications, setApplications] = useState({
    pending: [],
    approved: [],
    denied: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [reapplicationPolicy, setReapplicationPolicy] = useState('allowed');
  const [processing, setProcessing] = useState(false);

  // Fetch when type or status changes
  useEffect(() => {
    fetchApplications();
  }, [applicationType, statusTab]);

  // Reset applications when switching types
  useEffect(() => {
    setApplications({ pending: [], approved: [], denied: [] });
    setStatusTab('pending');
  }, [applicationType]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let apiPath;
      let statusParam = statusTab;
      
      if (applicationType === 'marketplace') {
        apiPath = 'api/v2/commerce/admin/marketplace/applications';
      } else if (applicationType === 'verified') {
        apiPath = 'api/v2/commerce/admin/verified/applications';
      } else {
        // Wholesale uses v2 API with different status naming
        apiPath = 'api/v2/commerce/wholesale/applications';
        // Map our tab names to wholesale API status values
        const wholesaleStatusMap = {
          'pending': 'pending',
          'approved': 'approved',
          'denied': 'denied'
        };
        statusParam = wholesaleStatusMap[statusTab];
      }
      
      const response = await authApiRequest(`${apiPath}?status=${statusParam}`);
      
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setApplications(prev => ({
          ...prev,
          [statusTab]: payload.applications || []
        }));
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!selectedApp) return;
    
    if (action === 'deny' && !denialReason.trim()) {
      alert('Please provide a reason for denial.');
      return;
    }

    setProcessing(true);
    try {
      let apiPath;
      if (applicationType === 'marketplace') {
        apiPath = `api/v2/commerce/admin/marketplace/applications/${selectedApp.id}/${action}`;
      } else if (applicationType === 'verified') {
        apiPath = `api/v2/commerce/admin/verified/applications/${selectedApp.id}/${action}`;
      } else {
        // Wholesale uses v2 API
        apiPath = `api/v2/commerce/wholesale/applications/${selectedApp.id}/${action}`;
      }
      
      const response = await authApiRequest(apiPath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_notes: action === 'deny' ? denialReason : `Application ${action}ed by admin`,
          denial_reason: action === 'deny' ? denialReason : null,
          ...(action === 'deny' && applicationType === 'wholesale' ? { reapplication_policy: reapplicationPolicy } : {})
        })
      });

      if (response.ok) {
        const typeNames = { marketplace: 'Marketplace', verified: 'Verified', wholesale: 'Wholesale' };
        alert(`${typeNames[applicationType]} application ${action}ed successfully!`);
        setSelectedApp(null);
        setDenialReason('');
        setReapplicationPolicy('allowed');
        fetchApplications();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      alert(`Error ${action}ing application.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedApp) return;
    
    const confirmMsgs = {
      marketplace: 'Remove marketplace access for this user? This revokes vendor permission.',
      verified: 'Remove verified status for this user?',
      wholesale: 'Remove wholesale access for this user?'
    };
    
    if (!confirm(confirmMsgs[applicationType])) return;

    setProcessing(true);
    try {
      const updatesByType = {
        marketplace: { vendor: false, marketplace: false },
        verified: { verified: false },
        wholesale: { wholesale: false }
      };
      
      const response = await authApiRequest(
        `api/v2/users/${selectedApp.user_id}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatesByType[applicationType])
        }
      );

      if (response.ok) {
        const typeNames = { marketplace: 'Marketplace', verified: 'Verified', wholesale: 'Wholesale' };
        alert(`${typeNames[applicationType]} access removed!`);
        setSelectedApp(null);
        fetchApplications();
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error removing access:', error);
      alert('Error removing access.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentApps = applications[statusTab] || [];
  
  // Get status fields based on application type
  const getStatusField = () => {
    if (applicationType === 'marketplace') return 'marketplace_status';
    if (applicationType === 'verified') return 'verification_status';
    return 'status'; // wholesale
  };
  const getReviewDateField = () => {
    if (applicationType === 'marketplace') return 'marketplace_review_date';
    if (applicationType === 'verified') return 'verification_review_date';
    return 'review_date'; // wholesale
  };
  const getNotesField = () => {
    if (applicationType === 'marketplace') return 'marketplace_admin_notes';
    if (applicationType === 'verified') return 'verification_admin_notes';
    return 'admin_notes'; // wholesale
  };
  
  // Helper to format wholesale business types
  const formatBusinessType = (type) => {
    const typeMap = {
      'retail_store': 'Retail Store',
      'online_retailer': 'Online Retailer',
      'gallery': 'Art Gallery',
      'museum_shop': 'Museum Shop',
      'gift_shop': 'Gift Shop',
      'boutique': 'Boutique',
      'interior_designer': 'Interior Designer',
      'event_planner': 'Event Planner',
      'distributor': 'Distributor',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };

  const formatOrderVolume = (volume) => {
    const volumeMap = {
      '500_1000': '$500 - $1,000',
      '1000_2500': '$1,000 - $2,500',
      '2500_5000': '$2,500 - $5,000',
      '5000_10000': '$5,000 - $10,000',
      '10000_plus': '$10,000+'
    };
    return volumeMap[volume] || volume;
  };

  return (
    <div className="admin-applications">
      {/* Top-level Application Type Tabs */}
      <div className="tabs tabs-primary" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          className={`tab tab-large ${applicationType === 'marketplace' ? 'active' : ''}`}
          onClick={() => setApplicationType('marketplace')}
          style={{ 
            background: applicationType === 'marketplace' ? '#055474' : '#e9ecef',
            color: applicationType === 'marketplace' ? 'white' : '#495057',
            fontWeight: 'bold',
            padding: '0.75rem 1.5rem'
          }}
        >
          🏪 Marketplace
        </button>
        <button
          type="button"
          className={`tab tab-large ${applicationType === 'verified' ? 'active' : ''}`}
          onClick={() => setApplicationType('verified')}
          style={{ 
            background: applicationType === 'verified' ? '#3e1c56' : '#e9ecef',
            color: applicationType === 'verified' ? 'white' : '#495057',
            fontWeight: 'bold',
            padding: '0.75rem 1.5rem'
          }}
        >
          ✓ Verified
        </button>
        <button
          type="button"
          className={`tab tab-large ${applicationType === 'wholesale' ? 'active' : ''}`}
          onClick={() => setApplicationType('wholesale')}
          style={{ 
            background: applicationType === 'wholesale' ? '#1a5f2a' : '#e9ecef',
            color: applicationType === 'wholesale' ? 'white' : '#495057',
            fontWeight: 'bold',
            padding: '0.75rem 1.5rem'
          }}
        >
          🏢 Wholesale
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab ${statusTab === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusTab('pending')}
        >
          Pending ({applications.pending?.length || 0})
        </button>
        <button
          type="button"
          className={`tab ${statusTab === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusTab('approved')}
        >
          Approved ({applications.approved?.length || 0})
        </button>
        <button
          type="button"
          className={`tab ${statusTab === 'denied' ? 'active' : ''}`}
          onClick={() => setStatusTab('denied')}
        >
          Denied ({applications.denied?.length || 0})
        </button>
      </div>

      {/* Application List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      ) : currentApps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {applicationType === 'marketplace' ? '🏪' : applicationType === 'verified' ? '✓' : '🏢'}
          </div>
          <h3>No {statusTab} {applicationType} applications</h3>
          <p>
            {statusTab === 'pending' 
              ? 'No applications are waiting for review.'
              : `No applications have been ${statusTab} yet.`}
          </p>
        </div>
      ) : (
        <div className="card-grid card-grid-2">
          {currentApps.map(app => (
            <div 
              key={app.id} 
              className="card card-clickable"
              onClick={() => setSelectedApp(app)}
            >
              <div className="card-body">
                <div className="card-title-row">
                  <h4>
                    {applicationType === 'wholesale' 
                      ? app.business_name 
                      : (app.user_name || (app.first_name && app.last_name 
                          ? `${app.first_name} ${app.last_name}` 
                          : app.username))}
                  </h4>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {formatDate(app.created_at)}
                  </span>
                </div>
                
                {applicationType === 'wholesale' ? (
                  <>
                    <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
                      <strong>{app.contact_name}</strong> • {formatBusinessType(app.business_type)}
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.25rem 0' }}>
                      Expected volume: {formatOrderVolume(app.expected_order_volume)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
                    {app.work_description?.length > 100 
                      ? `${app.work_description.substring(0, 100)}...`
                      : app.work_description}
                  </p>
                )}

                <div className="card-footer-row">
                  {applicationType !== 'wholesale' && (
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      📎 {Object.values(app.media_urls || {}).filter(Boolean).length} files
                    </span>
                  )}
                  {applicationType === 'wholesale' && app.website_url && (
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      🌐 Has website
                    </span>
                  )}
                  <span className={`status-badge ${statusTab === 'approved' ? 'success' : statusTab === 'denied' ? 'danger' : 'warning'}`}>
                    {statusTab}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div 
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="modal-header">
              <h2>
                {applicationType === 'marketplace' ? 'Marketplace' : 
                 applicationType === 'verified' ? 'Verified' : 'Wholesale'} Application Review
              </h2>
              <button 
                type="button"
                className="modal-close"
                onClick={() => setSelectedApp(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Wholesale-specific content */}
              {applicationType === 'wholesale' ? (
                <>
                  {/* Business Information */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Business Information</h3>
                    </div>
                    <div className="card-body">
                      <div className="info-grid info-grid-2">
                        <div className="info-item">
                          <span className="info-label">Business Name</span>
                          <span className="info-value">{selectedApp.business_name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Business Type</span>
                          <span className="info-value">{formatBusinessType(selectedApp.business_type)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Tax ID</span>
                          <span className="info-value">{selectedApp.tax_id}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Years in Business</span>
                          <span className="info-value">{selectedApp.years_in_business}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Expected Volume</span>
                          <span className="info-value">{formatOrderVolume(selectedApp.expected_order_volume)}</span>
                        </div>
                        {selectedApp.website_url && (
                          <div className="info-item">
                            <span className="info-label">Website</span>
                            <span className="info-value">
                              <a href={selectedApp.website_url} target="_blank" rel="noopener noreferrer">
                                {selectedApp.website_url}
                              </a>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business Address */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Business Address</h3>
                    </div>
                    <div className="card-body">
                      <p style={{ margin: 0 }}>
                        {selectedApp.business_address}<br />
                        {selectedApp.business_city}, {selectedApp.business_state} {selectedApp.business_zip}
                      </p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Contact Information</h3>
                    </div>
                    <div className="card-body">
                      <div className="info-grid info-grid-2">
                        <div className="info-item">
                          <span className="info-label">Primary Contact</span>
                          <span className="info-value">
                            {selectedApp.contact_name}
                            {selectedApp.contact_title && <span> ({selectedApp.contact_title})</span>}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Phone</span>
                          <span className="info-value">{selectedApp.business_phone}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{selectedApp.business_email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">User ID</span>
                          <span className="info-value">{selectedApp.user_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Business Details</h3>
                    </div>
                    <div className="card-body">
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Business Description:</strong>
                        <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0' }}>{selectedApp.business_description}</p>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Product Categories of Interest:</strong>
                        <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0' }}>{selectedApp.product_categories}</p>
                      </div>
                      {selectedApp.resale_certificate && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Resale Certificate:</strong>
                          <p style={{ margin: '0.5rem 0' }}>{selectedApp.resale_certificate}</p>
                        </div>
                      )}
                      {selectedApp.additional_info && (
                        <div>
                          <strong>Additional Information:</strong>
                          <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0' }}>{selectedApp.additional_info}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Marketplace/Verified Applicant Info */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Applicant Information</h3>
                    </div>
                    <div className="card-body">
                      <div className="info-grid info-grid-2">
                        <div className="info-item">
                          <span className="info-label">Name</span>
                          <span className="info-value">
                            {selectedApp.user_name || (selectedApp.first_name && selectedApp.last_name 
                              ? `${selectedApp.first_name} ${selectedApp.last_name}` 
                              : 'N/A')}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">{selectedApp.username}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Applied</span>
                          <span className="info-value">{formatDate(selectedApp.created_at)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Business</span>
                          <span className="info-value">{selectedApp.business_name || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">User ID</span>
                          <span className="info-value">{selectedApp.user_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work Description */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Work Description</h3>
                    </div>
                    <div className="card-body">
                      <p style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.work_description}</p>
                      {selectedApp.additional_info && (
                        <>
                          <h4 style={{ marginTop: '1rem' }}>Additional Information</h4>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.additional_info}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Jury Media */}
                  <div className="card">
                    <div className="card-header">
                      <h3>Jury Materials</h3>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                        Click to open full size
                      </p>
                    </div>
                    <div className="card-body">
                      <div className="media-grid">
                        {selectedApp.media_urls && Object.entries(selectedApp.media_urls).map(([key, url]) => {
                          if (!url) return null;
                          const isVideo = key.includes('video');
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          return (
                            <div key={key} className="media-item">
                              <span className="media-label">{label}</span>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                {isVideo ? (
                                  <div className="media-video-placeholder">
                                    <span>▶️</span>
                                    <span className="video-label">Video</span>
                                  </div>
                                ) : (
                                  <img src={url} alt={label} className="media-thumbnail" />
                                )}
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Admin Actions */}
              {statusTab === 'pending' && (
                <div className="card">
                  <div className="card-header">
                    <h3>Admin Actions</h3>
                  </div>
                  <div className="card-body">
                    <div className="action-row">
                      <button
                        type="button"
                        className="btn success"
                        onClick={() => handleAction('approve')}
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 
                          applicationType === 'marketplace' ? 'Approve & Grant Vendor Access' : 
                          applicationType === 'verified' ? 'Approve & Grant Verified Status' :
                          'Approve & Grant Wholesale Access'}
                      </button>
                      
                      <div className="denial-form">
                        <textarea
                          value={denialReason}
                          onChange={(e) => setDenialReason(e.target.value)}
                          placeholder="Reason for denial (required)..."
                          rows={3}
                          className="form-textarea"
                        />
                        {applicationType === 'wholesale' && (
                          <div style={{ margin: '8px 0' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              Reapplication Policy
                            </label>
                            <select
                              value={reapplicationPolicy}
                              onChange={(e) => setReapplicationPolicy(e.target.value)}
                              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                            >
                              <option value="allowed">Can reapply with proper requirements</option>
                              <option value="blocked">Cannot reapply with this account</option>
                              <option value="cooldown_90">Must wait 90 days to reapply</option>
                            </select>
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => handleAction('deny')}
                          disabled={processing || !denialReason.trim()}
                        >
                          Deny Application
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Review History (for approved/denied) */}
              {(statusTab === 'approved' || statusTab === 'denied') && (
                <div className="card">
                  <div className="card-header">
                    <h3>Review History</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-grid info-grid-2">
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className="info-value">{selectedApp[getStatusField()] || statusTab}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Reviewed</span>
                        <span className="info-value">{formatDate(selectedApp[getReviewDateField()])}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Reviewer</span>
                        <span className="info-value">{selectedApp.reviewer_name || 'Admin'}</span>
                      </div>
                      {selectedApp[getNotesField()] && (
                        <div className="info-item">
                          <span className="info-label">Notes</span>
                          <span className="info-value">{selectedApp[getNotesField()]}</span>
                        </div>
                      )}
                      {selectedApp.denial_reason && (
                        <div className="info-item">
                          <span className="info-label">Denial Reason</span>
                          <span className="info-value" style={{ color: '#dc3545' }}>{selectedApp.denial_reason}</span>
                        </div>
                      )}
                    </div>
                    
                    {statusTab === 'approved' && (
                      <div style={{ marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="btn danger btn-block"
                          onClick={handleRevokeAccess}
                          disabled={processing}
                        >
                          🚫 Remove {applicationType === 'marketplace' ? 'Marketplace' : 
                                    applicationType === 'verified' ? 'Verified' : 'Wholesale'} Access
                        </button>
                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                          {applicationType === 'marketplace' 
                            ? 'This revokes vendor permission. Verified status will remain.'
                            : applicationType === 'verified'
                            ? 'This revokes verified status only.'
                            : 'This revokes wholesale buyer access.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

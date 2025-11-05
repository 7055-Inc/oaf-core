import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getApiUrl } from '../../../../lib/config';

// Marketplace Applications Admin Component
// Title is handled by slide-in header template in Dashboard
export default function MarketplaceApplications({ userData }) {
  const [applicationsTab, setApplicationsTab] = useState('in-process');
  const [applications, setApplications] = useState({
    'in-process': [],
    'accepted': [],
    'denied': []
  });
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [applicationsTab]);

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      
      // Map tab names to database status values
      const statusMap = {
        'in-process': 'pending',
        'accepted': 'approved', 
        'denied': 'denied'
      };
      
      const status = statusMap[applicationsTab];
      const response = await authApiRequest(
        `api/admin/marketplace/applications?status=${status}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setApplications(prev => ({
          ...prev,
          [applicationsTab]: data.applications || []
        }));
      } else {
        console.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const openApplicationModal = (application) => {
    setSelectedApplication(application);
    setDenialReason('');
    setShowApplicationModal(true);
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setShowApplicationModal(false);
    setDenialReason('');
  };

  const handleApplicationAction = async (action) => {
    if (!selectedApplication) return;
    
    if (action === 'deny' && !denialReason.trim()) {
      alert('Please provide a reason for denial.');
      return;
    }

    try {
      setProcessingAction(true);
      
      const response = await authenticatedApiRequest(
        getApiUrl(`api/admin/marketplace/applications/${selectedApplication.id}/${action}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_notes: action === 'deny' ? denialReason : `Application ${action}ed by admin`,
            denial_reason: action === 'deny' ? denialReason : null
          })
        }
      );

      if (response.ok) {
        alert(`Application ${action}ed successfully!`);
        closeApplicationModal();
        // Refresh current tab and potentially others
        await fetchApplications();
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action} application: ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      alert(`Error ${action}ing application. Please try again.`);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedApplication) return;

    if (!confirm('Are you sure you want to remove marketplace access for this user? This will revoke their vendor permission.')) {
      return;
    }

    try {
      setProcessingAction(true);
      
      const response = await authApiRequest(
        `admin/users/${selectedApplication.user_id}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor: false,
            marketplace: false
          })
        }
      );

      if (response.ok) {
        alert('Marketplace access removed successfully!');
        closeApplicationModal();
        await fetchApplications();
      } else {
        const errorData = await response.json();
        alert(`Failed to remove access: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error removing marketplace access:', error);
      alert('Error removing marketplace access. Please try again.');
    } finally {
      setProcessingAction(false);
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

  const currentApplications = applications[applicationsTab] || [];

  return (
    <>
      <div className="form-card">
        <h3>Marketplace Applications</h3>
        <p>Review and manage marketplace jury applications</p>
      </div>

      {/* Applications Tab Navigation */}
      <div className="tab-container">
        <button
          className={`tab ${applicationsTab === 'in-process' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('in-process')}
        >
          In-Process ({applications['in-process']?.length || 0})
        </button>
        <button
          className={`tab ${applicationsTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('accepted')}
        >
          Accepted ({applications['accepted']?.length || 0})
        </button>
        <button
          className={`tab ${applicationsTab === 'denied' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('denied')}
        >
          Denied ({applications['denied']?.length || 0})
        </button>
      </div>

      {/* Applications List */}
      <div>
        {loadingApplications ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading applications...</p>
          </div>
        ) : currentApplications.length === 0 ? (
          <div className="empty-state">
            <div>📋</div>
            <div>
              <h3>No {applicationsTab.replace('-', ' ')} applications</h3>
              <p>
                {applicationsTab === 'in-process' 
                  ? 'No applications are currently pending review.'
                  : `No applications have been ${applicationsTab} yet.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="form-grid-2">
            {currentApplications.map(application => (
              <div 
                key={application.id} 
                className="form-card"
                onClick={() => openApplicationModal(application)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: '0' }}>{application.user_name || application.username}</h3>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    {formatDate(application.created_at)}
                  </span>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', color: '#495057' }}>
                  {application.work_description?.length > 100 
                    ? `${application.work_description.substring(0, 100)}...`
                    : application.work_description
                  }
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>
                    📎 {Object.values(application.media_urls || {}).filter(Boolean).length} files
                  </span>
                  <span className={`statusPending`}>
                    {applicationsTab.replace('-', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Review Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="modal-overlay" onClick={closeApplicationModal}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <h2>Application Review</h2>
              <button onClick={closeApplicationModal} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 100px)' }}>
              {/* Applicant Info */}
              <div className="form-card">
                <h3>Applicant Information</h3>
                <div className="form-grid-2">
                  <div><strong>Name:</strong> {selectedApplication.user_name || 'N/A'}</div>
                  <div><strong>Email:</strong> {selectedApplication.username}</div>
                  <div><strong>Applied:</strong> {formatDate(selectedApplication.created_at)}</div>
                  <div><strong>Business:</strong> {selectedApplication.business_name || 'N/A'}</div>
                </div>
              </div>

              {/* Work Description */}
              <div className="form-card">
                <h3>Work Description</h3>
                <p>{selectedApplication.work_description}</p>
                
                {selectedApplication.additional_info && (
                  <>
                    <h4>Additional Information</h4>
                    <p>{selectedApplication.additional_info}</p>
                  </>
                )}
              </div>

              {/* Jury Media */}
              <div className="form-card">
                <h3>Jury Materials</h3>
                <div className="form-grid-3">
                  {selectedApplication.media_urls && Object.entries(selectedApplication.media_urls).map(([key, url]) => {
                    if (!url) return null;
                    
                    const isVideo = key.includes('video');
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    return (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>{label}</div>
                        {isVideo ? (
                          <video controls style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '4px' }}>
                            <source src={url} type="video/mp4" />
                            Video not supported
                          </video>
                        ) : (
                          <img src={url} alt={label} style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '4px' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Actions */}
              {applicationsTab === 'in-process' && (
                <div className="form-card">
                  <h3>Admin Actions</h3>
                  
                  <div className="modal-actions">
                    <button
                      onClick={() => handleApplicationAction('approve')}
                      disabled={processingAction}
                    >
                      ✅ Approve Application
                    </button>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <textarea
                        value={denialReason}
                        onChange={(e) => setDenialReason(e.target.value)}
                        placeholder="Reason for denial (required)..."
                        rows={3}
                      />
                      <button
                        onClick={() => handleApplicationAction('deny')}
                        disabled={processingAction || !denialReason.trim()}
                        className="secondary"
                      >
                        ❌ Deny Application
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Review History */}
              {(applicationsTab === 'accepted' || applicationsTab === 'denied') && (
                <div className="form-card">
                  <h3>Review History</h3>
                  <div className="form-grid-2">
                    <div><strong>Status:</strong> {selectedApplication.marketplace_status}</div>
                    <div><strong>Reviewed:</strong> {formatDate(selectedApplication.marketplace_review_date)}</div>
                    <div><strong>Reviewer:</strong> {selectedApplication.reviewer_name || 'Admin'}</div>
                    {selectedApplication.marketplace_admin_notes && (
                      <div><strong>Notes:</strong> {selectedApplication.marketplace_admin_notes}</div>
                    )}
                  </div>
                  
                  {applicationsTab === 'accepted' && (
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={handleRevokeAccess}
                        disabled={processingAction}
                        className="secondary"
                        style={{ width: '100%' }}
                      >
                        🚫 Remove Marketplace Access
                      </button>
                      <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px', marginBottom: '0' }}>
                        This will revoke vendor permission (and nested marketplace/stripe_connect access). Verified status will remain.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

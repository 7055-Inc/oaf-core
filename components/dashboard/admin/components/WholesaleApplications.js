import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getApiUrl } from '../../../../lib/config';

// Wholesale Applications Admin Component
// Title is handled by slide-in header template in Dashboard
export default function WholesaleApplications({ userData }) {
  const [applicationsTab, setApplicationsTab] = useState('pending');
  const [applications, setApplications] = useState({
    'pending': [],
    'accepted': [],
    'rejected': []
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
        'pending': 'pending',
        'accepted': 'approved', 
        'rejected': 'denied'
      };
      
      const status = statusMap[applicationsTab];
      const response = await authApiRequest(
        `api/subscriptions/wholesale/admin/applications?status=${status}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setApplications(prev => ({
          ...prev,
          [applicationsTab]: data.applications || []
        }));
      } else {
        console.error('Failed to fetch wholesale applications');
      }
    } catch (error) {
      console.error('Error fetching wholesale applications:', error);
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
        getApiUrl(`api/subscriptions/wholesale/admin/applications/${selectedApplication.id}/${action}`),
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

  const formatYearsInBusiness = (years) => {
    const yearsMap = {
      'less_than_1': 'Less than 1 year',
      '1_2': '1-2 years',
      '3_5': '3-5 years',
      '6_10': '6-10 years',
      'more_than_10': 'More than 10 years'
    };
    return yearsMap[years] || years;
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
    <div className="form-card">
      {/* Applications Tabs */}
      <div className="tab-container">
        <div 
          className={`tab ${applicationsTab === 'pending' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('pending')}
        >
          Pending ({applications.pending.length})
        </div>
        <div 
          className={`tab ${applicationsTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('accepted')}
        >
          Accepted ({applications.accepted.length})
        </div>
        <div 
          className={`tab ${applicationsTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setApplicationsTab('rejected')}
        >
          Rejected ({applications.rejected.length})
        </div>
      </div>

      {/* Applications Content */}
      {loadingApplications ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading wholesale applications...</p>
        </div>
      ) : applications[applicationsTab].length === 0 ? (
        <div className="empty-state">
          <p>No {applicationsTab} wholesale applications found.</p>
        </div>
      ) : (
        <div style={{ padding: '20px' }}>
          {applications[applicationsTab].map(application => (
            <div 
              key={application.id} 
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '20px',
                marginBottom: '15px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s'
              }}
              onClick={() => openApplicationModal(application)}
              onMouseEnter={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
                    {application.business_name}
                  </h4>
                  <p style={{ margin: '5px 0', color: '#6c757d' }}>
                    <strong>Contact:</strong> {application.contact_name} ({application.business_email})
                  </p>
                  <p style={{ margin: '5px 0', color: '#6c757d' }}>
                    <strong>Type:</strong> {formatBusinessType(application.business_type)}
                  </p>
                  <p style={{ margin: '5px 0', color: '#6c757d' }}>
                    <strong>Expected Volume:</strong> {formatOrderVolume(application.expected_order_volume)}
                  </p>
                  {application.website_url && (
                    <p style={{ margin: '5px 0', color: '#6c757d' }}>
                      <strong>Website:</strong> 
                      <a href={application.website_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px', color: '#055474' }}>
                        {application.website_url}
                      </a>
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6c757d' }}>
                  <p>Applied: {new Date(application.created_at).toLocaleDateString()}</p>
                  {application.review_date && (
                    <p>Reviewed: {new Date(application.review_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application Detail Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 className="modal-title">Wholesale Application Review</h3>
                <button
                  onClick={closeApplicationModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6c757d'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Business Information */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                  Business Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <strong>Business Name:</strong><br />
                    {selectedApplication.business_name}
                  </div>
                  <div>
                    <strong>Business Type:</strong><br />
                    {formatBusinessType(selectedApplication.business_type)}
                  </div>
                  <div>
                    <strong>Tax ID:</strong><br />
                    {selectedApplication.tax_id}
                  </div>
                  <div>
                    <strong>Years in Business:</strong><br />
                    {formatYearsInBusiness(selectedApplication.years_in_business)}
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                  Business Address
                </h4>
                <p style={{ margin: '0' }}>
                  {selectedApplication.business_address}<br />
                  {selectedApplication.business_city}, {selectedApplication.business_state} {selectedApplication.business_zip}
                </p>
              </div>

              {/* Contact Information */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                  Contact Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <strong>Primary Contact:</strong><br />
                    {selectedApplication.contact_name}
                    {selectedApplication.contact_title && (
                      <span>, {selectedApplication.contact_title}</span>
                    )}
                  </div>
                  <div>
                    <strong>Phone:</strong><br />
                    {selectedApplication.business_phone}
                  </div>
                  <div>
                    <strong>Email:</strong><br />
                    {selectedApplication.business_email}
                  </div>
                  {selectedApplication.website_url && (
                    <div>
                      <strong>Website:</strong><br />
                      <a href={selectedApplication.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#055474' }}>
                        {selectedApplication.website_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Details */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                  Business Details
                </h4>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Business Description:</strong><br />
                  <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{selectedApplication.business_description}</p>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Product Categories of Interest:</strong><br />
                  <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{selectedApplication.product_categories}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <strong>Expected Monthly Volume:</strong><br />
                    {formatOrderVolume(selectedApplication.expected_order_volume)}
                  </div>
                  {selectedApplication.resale_certificate && (
                    <div>
                      <strong>Resale Certificate:</strong><br />
                      {selectedApplication.resale_certificate}
                    </div>
                  )}
                </div>
                {selectedApplication.additional_info && (
                  <div style={{ marginTop: '15px' }}>
                    <strong>Additional Information:</strong><br />
                    <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{selectedApplication.additional_info}</p>
                  </div>
                )}
              </div>

              {/* Application Status */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                  Application Status
                </h4>
                <p><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedApplication.status}</span></p>
                <p><strong>Applied:</strong> {new Date(selectedApplication.created_at).toLocaleString()}</p>
                {selectedApplication.review_date && (
                  <p><strong>Reviewed:</strong> {new Date(selectedApplication.review_date).toLocaleString()}</p>
                )}
                {selectedApplication.admin_notes && (
                  <div>
                    <strong>Admin Notes:</strong><br />
                    <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{selectedApplication.admin_notes}</p>
                  </div>
                )}
                {selectedApplication.denial_reason && (
                  <div>
                    <strong>Denial Reason:</strong><br />
                    <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap', color: '#dc3545' }}>{selectedApplication.denial_reason}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending Applications */}
              {selectedApplication.status === 'pending' && (
                <div>
                  <h4 style={{ color: '#2c3e50', marginBottom: '15px', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' }}>
                    Review Actions
                  </h4>
                  
                  {/* Denial Reason Input */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Denial Reason (required for rejection):
                    </label>
                    <textarea
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                      placeholder="Provide reason if rejecting application..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      onClick={() => handleApplicationAction('approve')}
                      disabled={processingAction}
                      className="button"
                      style={{ background: '#28a745' }}
                    >
                      {processingAction ? 'Processing...' : 'Approve Application'}
                    </button>
                    <button
                      onClick={() => handleApplicationAction('deny')}
                      disabled={processingAction || !denialReason.trim()}
                      className="button secondary"
                      style={{ background: '#dc3545', color: 'white' }}
                    >
                      {processingAction ? 'Processing...' : 'Reject Application'}
                    </button>
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

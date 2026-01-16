import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getApiUrl } from '../../../../lib/config';

// Verified Applications Admin Component
// Title is handled by slide-in header template in Dashboard
export default function VerifiedApplications({ userData }) {
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
  const [adminNotes, setAdminNotes] = useState('');
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
        `api/admin/verified/applications?status=${status}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setApplications(prev => ({
          ...prev,
          [applicationsTab]: data.applications || []
        }));
      } else {
        console.error('Failed to fetch verified applications');
      }
    } catch (error) {
      console.error('Error fetching verified applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const openApplicationModal = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
    setDenialReason('');
    setAdminNotes('');
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setShowApplicationModal(false);
    setDenialReason('');
    setAdminNotes('');
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;
    
    try {
      setProcessingAction(true);
      
      const response = await authApiRequest(
        `api/admin/verified/applications/${selectedApplication.id}/approve`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_notes: adminNotes.trim() || 'Application approved'
          })
        }
      );
      
      if (response.ok) {
        alert('Application approved successfully! User has been granted verified permissions.');
        closeApplicationModal();
        fetchApplications(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`Failed to approve application: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDenyApplication = async () => {
    if (!selectedApplication || !denialReason.trim()) {
      alert('Please provide a denial reason.');
      return;
    }
    
    try {
      setProcessingAction(true);
      
      const response = await authApiRequest(
        `api/admin/verified/applications/${selectedApplication.id}/deny`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            denial_reason: denialReason.trim(),
            admin_notes: adminNotes.trim()
          })
        }
      );
      
      if (response.ok) {
        alert('Application denied successfully.');
        closeApplicationModal();
        fetchApplications(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`Failed to deny application: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error denying application:', error);
      alert('Failed to deny application. Please try again.');
    } finally {
      setProcessingAction(false);
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

  const currentApplications = applications[applicationsTab] || [];

  return (
    <>
      <div className="form-card">
        <h3>Verified Applications</h3>
        <p>Review and manage artist verification applications</p>
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
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #f3f3f3',
              borderTop: '2px solid var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p>Loading applications...</p>
          </div>
        ) : currentApplications.length === 0 ? (
          <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No {applicationsTab.replace('-', ' ')} applications found.</p>
          </div>
        ) : (
          <div className="form-card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <caption className="sr-only">Verified artist applications</caption>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Artist</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Submitted</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  {applicationsTab !== 'in-process' && (
                    <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Reviewed</th>
                  )}
                  <th scope="col" style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentApplications.map((application) => (
                  <tr key={application.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <strong>
                          {application.first_name && application.last_name 
                            ? `${application.first_name} ${application.last_name}`
                            : application.username
                          }
                        </strong>
                        {application.business_name && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {application.business_name}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          ID: {application.user_id}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {formatDate(application.created_at)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: application.verification_status === 'approved' ? '#d4edda' :
                                   application.verification_status === 'denied' ? '#f8d7da' : '#fff3cd',
                        color: application.verification_status === 'approved' ? '#155724' :
                               application.verification_status === 'denied' ? '#721c24' : '#856404'
                      }}>
                        {application.verification_status?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    {applicationsTab !== 'in-process' && (
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div>{formatDate(application.verification_review_date)}</div>
                        {application.reviewer_name && (
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            by {application.reviewer_name}
                          </div>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => openApplicationModal(application)}
                        style={{
                          background: '#055474',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '2px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Review Modal */}
      {showApplicationModal && selectedApplication && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            maxWidth: '900px',
            maxHeight: '90vh',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 30px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>
                Verification Application Review
              </h3>
              <button
                onClick={closeApplicationModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              
              {/* Artist Information */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Artist Information</h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '4px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  <div>
                    <strong>Name:</strong> {selectedApplication.first_name && selectedApplication.last_name 
                      ? `${selectedApplication.first_name} ${selectedApplication.last_name}`
                      : selectedApplication.username
                    }
                  </div>
                  <div>
                    <strong>Username:</strong> {selectedApplication.username}
                  </div>
                  {selectedApplication.business_name && (
                    <div>
                      <strong>Business:</strong> {selectedApplication.business_name}
                    </div>
                  )}
                  <div>
                    <strong>User ID:</strong> {selectedApplication.user_id}
                  </div>
                  <div>
                    <strong>Submitted:</strong> {formatDate(selectedApplication.created_at)}
                  </div>
                </div>
              </div>

              {/* Work Description */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Work Description</h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {selectedApplication.work_description || 'No description provided'}
                </div>
              </div>

              {/* Additional Information */}
              {selectedApplication.additional_info && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Additional Information</h4>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {selectedApplication.additional_info}
                  </div>
                </div>
              )}

              {/* Portfolio Media */}
              {(selectedApplication.raw_materials_url || 
                selectedApplication.work_process_1_url || 
                selectedApplication.work_process_2_url || 
                selectedApplication.work_process_3_url || 
                selectedApplication.artist_at_work_url || 
                selectedApplication.booth_display_url) && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Portfolio Images</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {selectedApplication.raw_materials_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Raw Materials</p>
                        <img 
                          src={selectedApplication.raw_materials_url} 
                          alt="Raw Materials"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {selectedApplication.work_process_1_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Work Process 1</p>
                        <img 
                          src={selectedApplication.work_process_1_url} 
                          alt="Work Process 1"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {selectedApplication.work_process_2_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Work Process 2</p>
                        <img 
                          src={selectedApplication.work_process_2_url} 
                          alt="Work Process 2"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {selectedApplication.work_process_3_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Work Process 3</p>
                        <img 
                          src={selectedApplication.work_process_3_url} 
                          alt="Work Process 3"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {selectedApplication.artist_at_work_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Artist at Work</p>
                        <img 
                          src={selectedApplication.artist_at_work_url} 
                          alt="Artist at Work"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                    {selectedApplication.booth_display_url && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold' }}>Booth Display</p>
                        <img 
                          src={selectedApplication.booth_display_url} 
                          alt="Booth Display"
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application review..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Denial Reason (only show if denying) */}
              {applicationsTab === 'in-process' && (
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#dc3545'
                  }}>
                    Denial Reason (required if denying)
                  </label>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    placeholder="Provide a clear reason for denial that will be communicated to the artist..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {/* Previous Review Info */}
              {selectedApplication.verification_status !== 'pending' && (
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Previous Review</h4>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '4px'
                  }}>
                    <p><strong>Status:</strong> {selectedApplication.verification_status?.toUpperCase()}</p>
                    <p><strong>Reviewed:</strong> {formatDate(selectedApplication.verification_review_date)}</p>
                    {selectedApplication.reviewer_name && (
                      <p><strong>Reviewer:</strong> {selectedApplication.reviewer_name}</p>
                    )}
                    {selectedApplication.verification_admin_notes && (
                      <p><strong>Admin Notes:</strong> {selectedApplication.verification_admin_notes}</p>
                    )}
                    {selectedApplication.verification_denial_reason && (
                      <p><strong>Denial Reason:</strong> {selectedApplication.verification_denial_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {applicationsTab === 'in-process' && (
              <div style={{
                padding: '20px 30px',
                borderTop: '1px solid #e9ecef',
                display: 'flex',
                gap: '15px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleDenyApplication}
                  disabled={processingAction}
                  style={{
                    background: processingAction ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: processingAction ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processingAction ? 'Processing...' : 'Deny Application'}
                </button>
                
                <button
                  onClick={handleApproveApplication}
                  disabled={processingAction}
                  style={{
                    background: processingAction ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '2px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: processingAction ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processingAction ? 'Processing...' : 'Approve & Grant Verified Status'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

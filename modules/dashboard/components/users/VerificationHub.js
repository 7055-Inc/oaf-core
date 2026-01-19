/**
 * Verification Hub Component
 * 
 * Central hub for artist verification management:
 * - Permission-based access (verified permission from JWT)
 * - Terms acceptance flow
 * - Verified artist dashboard
 * - Application workflow with media uploads
 * - Application history
 * 
 * Uses global CSS classes from global.css
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { refreshAuthToken } from '../../../../lib/csrf';

const VerificationHub = ({ userData }) => {
  // Module state
  const [moduleState, setModuleState] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Terms data
  const [termsData, setTermsData] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Verified stats (for dashboard)
  const [verifiedStats, setVerifiedStats] = useState(null);

  // Application form state
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // Media uploads - required images
  const [rawMaterials, setRawMaterials] = useState(null);
  const [workInProcess1, setWorkInProcess1] = useState(null);
  const [workInProcess2, setWorkInProcess2] = useState(null);
  const [workInProcess3, setWorkInProcess3] = useState(null);
  const [artistAtWork, setArtistAtWork] = useState(null);
  const [boothDisplay, setBoothDisplay] = useState(null);
  
  // Media uploads - optional videos
  const [artistWorkingVideo, setArtistWorkingVideo] = useState(null);
  const [artistBioVideo, setArtistBioVideo] = useState(null);
  const [additionalVideo, setAdditionalVideo] = useState(null);

  // Application history
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    checkModuleAccess();
  }, [userData]);

  const checkModuleAccess = async () => {
    try {
      setLoading(true);
      const hasVerifiedPermission = userData?.permissions?.includes('verified');
      
      if (hasVerifiedPermission) {
        try {
          const termsResponse = await authApiRequest('subscriptions/verified/terms-check');
          
          if (termsResponse.ok) {
            const termsInfo = await termsResponse.json();
            
            if (termsInfo.termsAccepted) {
              setModuleState('dashboard');
              fetchVerifiedStats();
            } else {
              setModuleState('terms-required');
              setTermsData(termsInfo.latestTerms);
            }
          } else if (termsResponse.status === 404) {
            setModuleState('dashboard');
            fetchVerifiedStats();
          } else {
            setModuleState('dashboard');
            fetchVerifiedStats();
          }
        } catch (termsError) {
          setModuleState('dashboard');
          fetchVerifiedStats();
        }
      } else {
        setModuleState('signup');
        fetchTermsForSignup();
      }
      
      fetchApplicationHistory();
      
    } catch (err) {
      const hasVerifiedPermission = userData?.permissions?.includes('verified');
      setModuleState(hasVerifiedPermission ? 'dashboard' : 'signup');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermsForSignup = async () => {
    try {
      const termsResponse = await authApiRequest('subscriptions/verified/terms-check');
      if (termsResponse.ok) {
        const termsInfo = await termsResponse.json();
        setTermsData(termsInfo.latestTerms || termsInfo);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const fetchVerifiedStats = async () => {
    try {
      const response = await authApiRequest('subscriptions/verified/my');
      if (response.ok) {
        const data = await response.json();
        setVerifiedStats({
          status: 'active',
          verifiedDate: data.verification_status?.verified_at || new Date().toISOString(),
          expiryDate: data.verification_status?.expiry_date,
          level: data.verification_status?.verification_level || 'standard'
        });
      }
    } catch (err) {
      setVerifiedStats({
        status: 'active',
        verifiedDate: new Date().toISOString(),
        expiryDate: null
      });
    }
  };

  const fetchApplicationHistory = async () => {
    try {
      const response = await authApiRequest('subscriptions/verified/marketplace-applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const handleTermsAcceptance = async () => {
    if (!termsData?.id) return;
    
    try {
      setProcessing(true);
      
      const response = await authApiRequest('subscriptions/verified/terms-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_version_id: termsData.id })
      });
      
      if (response.ok) {
        try {
          await refreshAuthToken();
        } catch (tokenError) {
          // Continue anyway
        }
        
        setModuleState('dashboard');
        fetchVerifiedStats();
        setMessage({ text: 'Terms accepted successfully!', type: 'success' });
      } else {
        const errorData = await response.json();
        setError(`Failed to accept terms: ${errorData.error}`);
      }
    } catch (err) {
      setError('Failed to accept terms. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSignupTermsAccept = async () => {
    if (!termsData?.id) {
      setTermsAccepted(true);
      return;
    }
    
    try {
      setProcessing(true);
      
      const response = await authApiRequest('subscriptions/verified/terms-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_version_id: termsData.id })
      });
      
      if (response.ok) {
        setTermsAccepted(true);
        setMessage({ text: 'Terms accepted! You can now submit your application.', type: 'success' });
      } else {
        const errorData = await response.json();
        setError(`Failed to accept terms: ${errorData.error}`);
      }
    } catch (err) {
      setTermsAccepted(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (setter) => (event) => {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 50MB');
        return;
      }
      setter(file);
    }
  };

  const handleApplicationSubmit = async () => {
    const missingFields = [];
    if (!workDescription.trim()) missingFields.push('Work Description');
    if (!rawMaterials) missingFields.push('Raw Materials photo');
    if (!workInProcess1) missingFields.push('Work in Progress (Step 1) photo');
    if (!workInProcess2) missingFields.push('Work in Progress (Step 2) photo');
    if (!workInProcess3) missingFields.push('Work in Progress (Step 3) photo');
    if (!artistAtWork) missingFields.push('Photo of You Creating Your Work');
    if (!boothDisplay) missingFields.push('Booth/Studio Display photo');

    if (missingFields.length > 0) {
      setError(`Please complete all required fields:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const formData = new FormData();
      formData.append('work_description', workDescription);
      if (additionalInfo.trim()) {
        formData.append('additional_info', additionalInfo);
      }
      formData.append('verified_application', 'true');
      
      if (rawMaterials) formData.append('jury_raw_materials', rawMaterials);
      if (workInProcess1) formData.append('jury_work_process_1', workInProcess1);
      if (workInProcess2) formData.append('jury_work_process_2', workInProcess2);
      if (workInProcess3) formData.append('jury_work_process_3', workInProcess3);
      if (artistAtWork) formData.append('jury_artist_at_work', artistAtWork);
      if (boothDisplay) formData.append('jury_booth_display', boothDisplay);
      
      if (artistWorkingVideo) formData.append('jury_artist_working_video', artistWorkingVideo);
      if (artistBioVideo) formData.append('jury_artist_bio_video', artistBioVideo);
      if (additionalVideo) formData.append('jury_additional_video', additionalVideo);

      const response = await authApiRequest('users/me', {
        method: 'PATCH',
        body: formData
      });

      if (response.ok) {
        setMessage({ text: 'Application submitted successfully! You will receive an email once reviewed.', type: 'success' });
        
        setWorkDescription('');
        setAdditionalInfo('');
        setRawMaterials(null);
        setWorkInProcess1(null);
        setWorkInProcess2(null);
        setWorkInProcess3(null);
        setArtistAtWork(null);
        setBoothDisplay(null);
        setArtistWorkingVideo(null);
        setArtistBioVideo(null);
        setAdditionalVideo(null);
        setShowApplicationModal(false);
        
        fetchApplicationHistory();
      } else {
        const errorData = await response.json();
        setError(`Application submission failed: ${errorData.error}`);
      }
    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'muted' },
      submitted: { label: 'Under Review', className: 'pending' },
      under_review: { label: 'In Review', className: 'pending' },
      approved: { label: 'Approved', className: 'success' },
      rejected: { label: 'Rejected', className: 'danger' },
      revision_requested: { label: 'Revision Requested', className: 'warning' }
    };
    const config = statusConfig[status] || { label: status, className: 'muted' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading verification status...</p>
      </div>
    );
  }

  // Terms required state
  if (moduleState === 'terms-required') {
    return (
      <div>
        <div className="form-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <i className="fa-solid fa-file-contract" style={{ fontSize: '48px', color: 'var(--primary-color)', marginBottom: '16px', display: 'block' }}></i>
            <h3 style={{ margin: '0 0 8px' }}>Verification Service Terms</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>You already have verified status! Please review and accept the updated terms.</p>
          </div>

          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', maxHeight: '300px', overflow: 'auto', marginBottom: '24px' }}>
            <h4 style={{ marginTop: 0 }}>{termsData?.title || 'Verification Service Terms'}</h4>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#374151' }}>
              {termsData?.content || 'Loading terms content...'}
            </div>
          </div>

          <div className="form-actions">
            <button onClick={handleTermsAcceptance} disabled={processing}>
              {processing ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Accepting...</>
              ) : (
                <><i className="fa-solid fa-check"></i> Accept Terms</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard state (verified users)
  if (moduleState === 'dashboard') {
    return (
      <div>
        {message.text && (
          <div className={`${message.type}-alert`}>
            <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {message.text}
          </div>
        )}

        {/* Verified Status Card */}
        <div className="status-indicator verified" style={{ marginBottom: '24px', padding: '24px' }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: '48px' }}></i>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', color: 'inherit' }}>Verified Artist Status</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Your account has been verified and you have access to all premium features.</p>
            {verifiedStats?.verifiedDate && (
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}><strong>Verified:</strong> {formatDate(verifiedStats.verifiedDate)}</p>
            )}
          </div>
          <span className="status-badge success">
            <i className="fa-solid fa-certificate"></i> Verified
          </span>
        </div>

        {/* Benefits Grid */}
        <div className="form-card">
          <h3>Your Verification Benefits</h3>
          <div className="form-grid-3">
            <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
              <i className="fa-solid fa-badge-check" style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '12px', display: 'block' }}></i>
              <h4 style={{ margin: '0 0 8px' }}>Verified Badge</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Your profile displays a verified checkmark, building trust with collectors.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
              <i className="fa-solid fa-user-shield" style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '12px', display: 'block' }}></i>
              <h4 style={{ margin: '0 0 8px' }}>Enhanced Profile</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Access to advanced profile customization and analytics.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
              <i className="fa-solid fa-headset" style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '12px', display: 'block' }}></i>
              <h4 style={{ margin: '0 0 8px' }}>Priority Support</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Faster response times and dedicated support.</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="form-card">
          <h3>Quick Actions</h3>
          <div className="quick-links">
            <a href="/profile"><i className="fa-solid fa-user"></i> View My Profile</a>
            <a href="/dashboard" className="secondary"><i className="fa-solid fa-gauge-high"></i> Dashboard Home</a>
          </div>
        </div>

        {/* Application History */}
        {applications.length > 0 && (
          <div className="form-card">
            <h3>Application History</h3>
            <div className="expandable-list">
              {applications.map(app => (
                <div key={app.id} className="expandable-row">
                  <div className="expandable-row-header" style={{ cursor: 'default' }}>
                    <div style={{ flex: 1 }}>
                      <strong>Verification Application</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Applied: {formatDate(app.created_at)}</p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Signup state (non-verified users)
  return (
    <div>
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {message.text && (
        <div className={`${message.type}-alert`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {message.text}
        </div>
      )}

      {/* Benefits Section */}
      <div className="form-card">
        <h3>Verification Benefits</h3>
        <div className="form-grid-4">
          <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <i className="fa-solid fa-badge-check" style={{ fontSize: '28px', color: 'var(--primary-color)', marginBottom: '10px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px' }}>Verified Badge</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Display a verified checkmark on your profile</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <i className="fa-solid fa-chart-line" style={{ fontSize: '28px', color: 'var(--primary-color)', marginBottom: '10px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px' }}>Enhanced Credibility</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Build trust with collectors</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <i className="fa-solid fa-headset" style={{ fontSize: '28px', color: 'var(--primary-color)', marginBottom: '10px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px' }}>Priority Support</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Faster response times</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <i className="fa-solid fa-star" style={{ fontSize: '28px', color: 'var(--primary-color)', marginBottom: '10px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px', fontSize: '14px' }}>Premium Features</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Advanced customization</p>
          </div>
        </div>
      </div>

      {/* Terms Acceptance Step */}
      {!termsAccepted && termsData?.content && (
        <div className="form-card">
          <h3>Step 1: Terms & Conditions</h3>
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', maxHeight: '200px', overflow: 'auto', marginBottom: '20px' }}>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#374151', fontSize: '14px' }}>
              {termsData.content}
            </div>
          </div>
          <div className="form-actions">
            <button onClick={handleSignupTermsAccept} disabled={processing}>
              {processing ? 'Accepting...' : 'Accept Terms & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Application Step */}
      {(termsAccepted || !termsData?.content) && (
        <div className="form-card">
          <h3>{termsData?.content ? 'Step 2: ' : ''}Submit Verification Application</h3>
          <p className="form-hint">
            Provide the required information for your verification application. 
            Our team will review and notify you within 3-5 business days.
          </p>
          <button onClick={() => setShowApplicationModal(true)} style={{ width: '100%' }}>
            <i className="fa-solid fa-pen-to-square"></i> Start Verification Application
          </button>
        </div>
      )}

      {/* Application History */}
      {applications.length > 0 && (
        <div className="form-card">
          <h3>Your Applications</h3>
          <div className="expandable-list">
            {applications.map(app => (
              <div key={app.id} className="expandable-row">
                <div className="expandable-row-header" style={{ cursor: 'default' }}>
                  <div style={{ flex: 1 }}>
                    <strong>Verification Application</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Applied: {formatDate(app.created_at)}
                      {app.submitted_at && <> • Submitted: {formatDate(app.submitted_at)}</>}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
                {app.reviewer_notes && (
                  <div className="expandable-row-content">
                    <p style={{ margin: 0 }}><strong>Reviewer Notes:</strong> {app.reviewer_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <button className="modal-close" onClick={() => setShowApplicationModal(false)}>×</button>
            <h3 className="modal-title">Artist Verification Application</h3>

            <div className="modal-body">
              {/* Work Description */}
              <div style={{ marginBottom: '20px' }}>
                <label className="required">Describe Your Artistic Work</label>
                <textarea
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Please describe your artistic practice, techniques, and the type of work you create..."
                  rows={5}
                  required
                />
              </div>

              {/* Additional Info */}
              <div style={{ marginBottom: '24px' }}>
                <label>Additional Information</label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any additional information about your background, experience, or artistic journey..."
                  rows={3}
                />
              </div>

              {/* Required Images */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '16px' }}>
                  Portfolio Media <span style={{ color: '#dc2626', fontWeight: 'normal', fontSize: '13px' }}>* All 6 images required</span>
                </h4>
                
                <div className="form-grid-3">
                  <div>
                    <label className="required">Raw Materials</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setRawMaterials)} />
                    {rawMaterials && <span className="file-selected"><i className="fa-solid fa-check"></i> {rawMaterials.name}</span>}
                  </div>
                  <div>
                    <label className="required">Work in Progress 1</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setWorkInProcess1)} />
                    {workInProcess1 && <span className="file-selected"><i className="fa-solid fa-check"></i> {workInProcess1.name}</span>}
                  </div>
                  <div>
                    <label className="required">Work in Progress 2</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setWorkInProcess2)} />
                    {workInProcess2 && <span className="file-selected"><i className="fa-solid fa-check"></i> {workInProcess2.name}</span>}
                  </div>
                  <div>
                    <label className="required">Work in Progress 3</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setWorkInProcess3)} />
                    {workInProcess3 && <span className="file-selected"><i className="fa-solid fa-check"></i> {workInProcess3.name}</span>}
                  </div>
                  <div>
                    <label className="required">Artist at Work</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setArtistAtWork)} />
                    {artistAtWork && <span className="file-selected"><i className="fa-solid fa-check"></i> {artistAtWork.name}</span>}
                  </div>
                  <div>
                    <label className="required">Booth/Studio Display</label>
                    <input type="file" accept="image/*" onChange={handleFileChange(setBoothDisplay)} />
                    {boothDisplay && <span className="file-selected"><i className="fa-solid fa-check"></i> {boothDisplay.name}</span>}
                  </div>
                </div>
              </div>

              {/* Optional Videos */}
              <div>
                <h4 style={{ marginBottom: '16px' }}>
                  Videos <span style={{ color: '#6b7280', fontWeight: 'normal', fontSize: '13px' }}>(Optional)</span>
                </h4>
                
                <div className="form-grid-3">
                  <div>
                    <label>Artist Working Video</label>
                    <input type="file" accept="video/*" onChange={handleFileChange(setArtistWorkingVideo)} />
                    {artistWorkingVideo && <span className="file-selected"><i className="fa-solid fa-check"></i> {artistWorkingVideo.name}</span>}
                  </div>
                  <div>
                    <label>Artist Bio Video</label>
                    <input type="file" accept="video/*" onChange={handleFileChange(setArtistBioVideo)} />
                    {artistBioVideo && <span className="file-selected"><i className="fa-solid fa-check"></i> {artistBioVideo.name}</span>}
                  </div>
                  <div>
                    <label>Additional Video</label>
                    <input type="file" accept="video/*" onChange={handleFileChange(setAdditionalVideo)} />
                    {additionalVideo && <span className="file-selected"><i className="fa-solid fa-check"></i> {additionalVideo.name}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowApplicationModal(false)} disabled={processing}>
                Cancel
              </button>
              <button onClick={handleApplicationSubmit} disabled={processing || !workDescription.trim()}>
                {processing ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane"></i> Submit Application</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationHub;

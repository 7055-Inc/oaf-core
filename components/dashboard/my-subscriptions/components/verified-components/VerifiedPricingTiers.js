import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../../lib/csrf';
import { authApiRequest } from '../../../../../lib/apiUtils';
import { getApiUrl } from '../../../../../lib/config';
import StripeCardSetup from '../../../../stripe/StripeCardSetup';

export default function VerifiedPricingTiers({ userData, onSubscriptionSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  
  // Terms and permission state
  const [verifiedStatus, setVerifiedStatus] = useState(null);
  const [termsData, setTermsData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // Application form data
  const [userProfile, setUserProfile] = useState(null);
  const [workDescription, setWorkDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // Individual media uploads
  const [rawMaterials, setRawMaterials] = useState(null);
  const [workInProcess1, setWorkInProcess1] = useState(null);
  const [workInProcess2, setWorkInProcess2] = useState(null);
  const [workInProcess3, setWorkInProcess3] = useState(null);
  const [artistAtWork, setArtistAtWork] = useState(null);
  const [boothDisplay, setBoothDisplay] = useState(null);
  
  // Video uploads
  const [artistWorkingVideo, setArtistWorkingVideo] = useState(null);
  const [artistBioVideo, setArtistBioVideo] = useState(null);
  const [additionalVideo, setAdditionalVideo] = useState(null);
  
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Check verified status and terms on component mount
  useEffect(() => {
    fetchVerifiedStatus();
  }, []);

  const fetchVerifiedStatus = async () => {
    try {
      setLoadingStatus(true);
      
      // Only fetch terms data - verified status is available from user permissions
      const termsResponse = await authenticatedApiRequest(
        getApiUrl('api/subscriptions/verified/terms-check')
      );
      
      if (termsResponse.ok) {
        const termsInfo = await termsResponse.json();
        setTermsData(termsInfo);
      }
      
    } catch (error) {
      console.error('Error fetching verified terms:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTermsAcceptance = async () => {
    if (!termsData?.latestTerms?.id) return;
    
    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest(
        getApiUrl('api/subscriptions/verified/terms-accept'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            terms_version_id: termsData.latestTerms.id
          })
        }
      );
      
      if (response.ok) {
        // Refresh token to get updated permissions with new verified access
        try {
          const newToken = await refreshAuthToken();
          if (newToken) {
            // Token refresh successful - user now has updated permissions
            console.log('Token refreshed successfully with updated verified permissions');
          } else {
            console.warn('Token refresh returned null - user may need to log in again for updated permissions');
            // Show a subtle warning but continue
            alert('Terms accepted successfully! You may need to refresh the page to see updated permissions.');
          }
        } catch (tokenError) {
          console.warn('Token refresh failed after terms acceptance:', tokenError);
          // Show a subtle warning but continue - the terms acceptance was successful
          alert('Terms accepted successfully! Please refresh the page to see updated permissions.');
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to accept terms: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Failed to accept terms. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSignupClick = async () => {
    if (!signupTermsAccepted) {
      alert('Please accept the terms and conditions first.');
      return;
    }

    setShowSignupModal(true);
  };

  const handleApplicationSubmit = async () => {
    try {
      setProcessing(true);

      // Create FormData for the enhanced /users/me endpoint
      const formData = new FormData();
      
      // Add application text data
      formData.append('work_description', workDescription);
      if (additionalInfo.trim()) {
        formData.append('additional_info', additionalInfo);
      }
      formData.append('verified_application', 'true'); // Flag to indicate verified application
      
      // Add jury media files with proper field names
      if (rawMaterials) {
        formData.append('jury_raw_materials', rawMaterials);
      }
      if (workInProcess1) {
        formData.append('jury_work_process_1', workInProcess1);
      }
      if (workInProcess2) {
        formData.append('jury_work_process_2', workInProcess2);
      }
      if (workInProcess3) {
        formData.append('jury_work_process_3', workInProcess3);
      }
      if (artistAtWork) {
        formData.append('jury_artist_at_work', artistAtWork);
      }
      if (boothDisplay) {
        formData.append('jury_booth_display', boothDisplay);
      }
      if (artistWorkingVideo) {
        formData.append('jury_artist_working_video', artistWorkingVideo);
      }
      if (artistBioVideo) {
        formData.append('jury_artist_bio_video', artistBioVideo);
      }
      if (additionalVideo) {
        formData.append('jury_additional_video', additionalVideo);
      }

      // Submit everything to the enhanced /users/me PATCH endpoint
      const response = await authenticatedApiRequest(getApiUrl('users/me'), {
        method: 'PATCH',
        body: formData // multipart form data, no Content-Type header needed
      });

      if (response.ok) {
        const data = await response.json();
        
        alert('Verified application submitted successfully! You will receive an email notification once your application has been reviewed.');
        
        // Clear form data
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
        setShowSignupModal(false);
        
        // Refresh the parent component
        if (onSubscriptionSuccess) {
          onSubscriptionSuccess();
        }
        
      } else {
        const errorData = await response.json();
        alert(`Application submission failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting verified application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (setter) => (event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic file validation
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        alert('File size must be less than 50MB');
        return;
      }
      setter(file);
    }
  };

  if (loadingStatus) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          width: '20px', 
          height: '20px', 
          border: '2px solid #f3f3f3',
          borderTop: '2px solid var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Loading verified subscription status...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          Artist Verification Program
        </h2>
        <p style={{ color: '#6c757d', lineHeight: '1.6' }}>
          Get verified artist status to enhance your credibility and unlock premium features. 
          Our verification process ensures authentic artists and helps collectors trust your work.
        </p>
      </div>

      {/* Verification Benefits */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '25px', 
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
          Verification Benefits
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Verified Badge</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Display a verified checkmark on your profile and listings
            </p>
          </div>
          <div>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Enhanced Credibility</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Build trust with collectors and increase sales potential
            </p>
          </div>
          <div>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Priority Support</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Get faster response times for customer support requests
            </p>
          </div>
          <div>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Premium Features</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Access to advanced profile customization and analytics
            </p>
          </div>
        </div>
      </div>

      {/* Terms Acceptance Section */}
      {!signupTermsAccepted && termsData?.latestTerms && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>
            Step 1: Terms & Conditions
          </h4>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #dee2e6', 
            padding: '15px', 
            marginBottom: '15px',
            whiteSpace: 'pre-line',
            lineHeight: '1.5',
            fontSize: '13px',
            background: '#f8f9fa'
          }}>
            {termsData.latestTerms.content}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                handleTermsAcceptance();
                setSignupTermsAccepted(true);
              }}
              disabled={processing}
              style={{
                background: '#055474',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '2px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.7 : 1
              }}
            >
              {processing ? 'Accepting...' : 'Accept Terms & Continue'}
            </button>
          </div>
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
        </div>
      )}

      {signupTermsAccepted && (
        <div style={{ 
          background: 'white', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px', 
          padding: '30px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
            Step 2: Submit Verification Application
          </h3>
          
          <p style={{ color: '#6c757d', marginBottom: '25px', lineHeight: '1.6' }}>
            Please provide the following information to complete your verification application. 
            Our team will review your submission and notify you of the decision within 3-5 business days.
          </p>

          <button
            onClick={handleSignupClick}
            disabled={processing}
            style={{
              background: 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '2px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.7 : 1,
              width: '100%'
            }}
          >
            {processing ? 'Processing...' : 'Start Verification Application'}
          </button>
        </div>
      )}

      {/* Application Modal */}
      {showSignupModal && (
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
            maxWidth: '800px',
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
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Artist Verification Application</h3>
              <button
                onClick={() => setShowSignupModal(false)}
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
              
              {/* Work Description */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Describe Your Artistic Work *
                </label>
                <textarea
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Please describe your artistic practice, techniques, and the type of work you create..."
                  required
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Additional Info */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Additional Information
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any additional information about your background, experience, or artistic journey..."
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

              {/* Media Upload Section */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Portfolio Media</h4>
                <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
                  Please upload images and videos that showcase your artistic process and finished work.
                </p>

                {/* Image Uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Raw Materials
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setRawMaterials)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {rawMaterials && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {rawMaterials.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Work in Process 1
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setWorkInProcess1)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {workInProcess1 && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {workInProcess1.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Work in Process 2
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setWorkInProcess2)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {workInProcess2 && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {workInProcess2.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Work in Process 3
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setWorkInProcess3)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {workInProcess3 && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {workInProcess3.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Artist at Work
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setArtistAtWork)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {artistAtWork && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {artistAtWork.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Booth Display
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setBoothDisplay)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {boothDisplay && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {boothDisplay.name}</p>}
                  </div>
                </div>

                {/* Video Uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Artist Working Video
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange(setArtistWorkingVideo)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {artistWorkingVideo && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {artistWorkingVideo.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Artist Bio Video
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange(setArtistBioVideo)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {artistBioVideo && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {artistBioVideo.name}</p>}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                      Additional Video
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange(setAdditionalVideo)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                    {additionalVideo && <p style={{ fontSize: '11px', color: '#28a745', margin: '5px 0 0 0' }}>✓ {additionalVideo.name}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
                <button
                  onClick={handleApplicationSubmit}
                  disabled={processing || !workDescription.trim()}
                  style={{
                    background: processing || !workDescription.trim() ? '#6c757d' : 'linear-gradient(135deg, #055474 0%, #3e1c56 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '2px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: processing || !workDescription.trim() ? 'not-allowed' : 'pointer',
                    marginRight: '15px'
                  }}
                >
                  {processing ? 'Submitting Application...' : 'Submit Verification Application'}
                </button>
                
                <button
                  onClick={() => setShowSignupModal(false)}
                  disabled={processing}
                  style={{
                    background: 'transparent',
                    color: '#6c757d',
                    border: '1px solid #6c757d',
                    padding: '12px 30px',
                    borderRadius: '2px',
                    fontSize: '1rem',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

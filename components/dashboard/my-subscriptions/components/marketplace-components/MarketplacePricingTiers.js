import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../../lib/csrf';
import { authApiRequest } from '../../../../../lib/apiUtils';
import { getApiUrl } from '../../../../../lib/config';
import StripeCardSetup from '../../../../stripe/StripeCardSetup';

export default function MarketplacePricingTiers({ userData, onSubscriptionSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  
  // Terms and permission state
  const [marketplaceStatus, setMarketplaceStatus] = useState(null);
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

  // Check marketplace status and terms on component mount
  useEffect(() => {
    fetchMarketplaceStatus();
  }, []);

  const fetchMarketplaceStatus = async () => {
    try {
      setLoadingStatus(true);
      
      // Only fetch terms data - marketplace status is available from user permissions
      const termsResponse = await authenticatedApiRequest(
        getApiUrl('api/subscriptions/marketplace/terms-check')
      );
      
      if (termsResponse.ok) {
        const termsInfo = await termsResponse.json();
        setTermsData(termsInfo);
      }
      
    } catch (error) {
      console.error('Error fetching marketplace terms:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTermsAcceptance = async () => {
    if (!termsData?.latestTerms?.id) return;
    
    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest(
        getApiUrl('api/subscriptions/marketplace/terms-accept'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            terms_version_id: termsData.latestTerms.id
          })
        }
      );
      
      if (response.ok) {
        // Refresh token to get updated permissions with new marketplace access
        try {
          const newToken = await refreshAuthToken();
          if (newToken) {
            // Token refresh successful - user now has updated permissions
            console.log('Token refreshed successfully with updated marketplace permissions');
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
      alert('Error accepting terms. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSignupClick = async () => {
    setSignupTermsAccepted(false);
    setShowSignupModal(true);
    
    // Load user profile data
    try {
      const response = await authenticatedApiRequest(getApiUrl('users/me'));
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
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
      formData.append('marketplace_application', 'true'); // Flag to indicate marketplace application
      
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
        
        alert('Your marketplace jury application has been submitted successfully! You will be notified once it has been reviewed by our jury panel.');
        setShowSignupModal(false);
        
        // Reset form
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
        
        // Refresh user data to show the new application
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Application failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting marketplace application:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loadingStatus) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#6c757d' }}>Loading marketplace status...</div>
      </div>
    );
  }

  // Check JWT permissions first (source of truth)
  const hasMarketplacePermission = userData?.permissions?.includes('marketplace');

  // User has marketplace permission - show dashboard or terms modal
  if (hasMarketplacePermission) {
    // Check if terms need to be accepted
    if (!marketplaceStatus?.termsAccepted && termsData?.latestTerms) {
      // Show terms modal overlay (not full page)
      return (
        <div style={{ padding: '20px' }}>
          <div style={{ 
            background: '#d4edda', 
            border: '1px solid #c3e6cb', 
            borderRadius: '6px', 
            padding: '20px', 
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#155724', marginBottom: '10px' }}>
              ✅ Marketplace Access Active
            </h3>
            <p style={{ color: '#155724', margin: '0' }}>
              Your marketplace access is active. Your products are eligible for marketplace curation.
            </p>
            {marketplaceStatus?.applicationStatus && (
              <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#6c757d' }}>
                Application status: <strong>{marketplaceStatus.applicationStatus.marketplace_status}</strong>
                {marketplaceStatus.applicationStatus.marketplace_review_date && (
                  <span> (reviewed {new Date(marketplaceStatus.applicationStatus.marketplace_review_date).toLocaleDateString()})</span>
                )}
              </div>
            )}
          </div>

          {/* Terms acceptance notice */}
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#856404', marginBottom: '10px' }}>
              📋 Terms Update Required
            </h4>
            <p style={{ color: '#856404', marginBottom: '15px' }}>
              Please accept the latest marketplace terms to continue using the service.
            </p>
            <button
              onClick={handleTermsAcceptance}
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
              {processing ? 'Accepting...' : 'Accept Updated Terms'}
            </button>
          </div>
        </div>
      );
    }

    // All good - show active dashboard
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ 
          background: '#d4edda', 
          border: '1px solid #c3e6cb', 
          borderRadius: '6px', 
          padding: '20px', 
          textAlign: 'center' 
        }}>
          <h3 style={{ color: '#155724', marginBottom: '10px' }}>
            ✅ Marketplace Access Active
          </h3>
          <p style={{ color: '#155724', margin: '0' }}>
            Your marketplace access is active. Your products are eligible for marketplace curation.
          </p>
          {marketplaceStatus?.applicationStatus && (
            <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#6c757d' }}>
              Application status: <strong>{marketplaceStatus.applicationStatus.marketplace_status}</strong>
              {marketplaceStatus.applicationStatus.marketplace_review_date && (
                <span> (reviewed {new Date(marketplaceStatus.applicationStatus.marketplace_review_date).toLocaleDateString()})</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No marketplace permission - show signup/tiers page
  // Terms will be handled within the application form modal

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '2rem' }}>
          Join the Marketplace
        </h2>
        <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          {/* Description removed per user request */}
        </p>
      </div>

      {/* Marketplace Plan */}
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          border: '2px solid #055474',
          borderRadius: '2px',
          padding: '30px',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Popular badge */}
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#055474',
            color: 'white',
            padding: '6px 20px',
            borderRadius: '2px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            FREE TO JOIN
          </div>

          <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.5rem' }}>
            Marketplace Access
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#055474', marginBottom: '10px' }}>
              Flat commission rate: 15% of sales
            </div>
            <div style={{ color: '#6c757d', fontSize: '1rem' }}>
              No other fees. Paid add-ons available.
            </div>
          </div>

          {/* Features */}
          <div style={{ textAlign: 'left', marginBottom: '30px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '16px' }}>What's included:</h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              {[
                'Curated marketplaces',
                'Auto-sync to your custom website',
                'Free marketing and promotion',
                'Addons to expand selling platforms*',
                'Discounted shipping labels',
                'Custom products',
                'Seller support',
                'Auto-list on 3rd party marketplaces',
                'Free Artist Verification badge and site certification'
              ].map((feature, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  color: '#495057',
                  fontSize: '14px'
                }}>
                  <span style={{ color: '#28a745', marginRight: '10px', fontWeight: 'bold' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Available Add-ons */}
          <div style={{ textAlign: 'left', marginBottom: '30px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '16px' }}>Most popular addons:</h4>
            <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
              {[
                'Wholesale pricing',
                'Sponsored search',
                'Etsy Connector',
                'TikTok Shop Connector',
                'Amazon Connector'
              ].map((addon, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  color: '#6c757d',
                  fontSize: '13px'
                }}>
                  <span style={{ color: '#055474', marginRight: '10px' }}>+</span>
                  {addon}
                </li>
              ))}
            </ul>
          </div>

          {/* Check if user has existing marketplace application */}
          {userProfile?.marketplace_application ? (
            <div style={{ textAlign: 'center' }}>
              {userProfile.marketplace_application.marketplace_status === 'pending' && (
                <div>
                  <div style={{
                    padding: '15px',
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '2px',
                    marginBottom: '15px'
                  }}>
                    <strong>Application Under Review</strong>
                    <p style={{ margin: '5px 0 0', color: '#856404' }}>
                      Your marketplace application is being reviewed by our jury panel. 
                      You will be notified once a decision has been made.
                    </p>
                  </div>
                  <button
                    onClick={handleSignupClick}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Update Application
                  </button>
                </div>
              )}
              
              {userProfile.marketplace_application.marketplace_status === 'approved' && (
                <div style={{
                  padding: '15px',
                  background: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '2px',
                  color: '#155724'
                }}>
                  <strong>✅ Marketplace Access Approved!</strong>
                  <p style={{ margin: '5px 0 0' }}>
                    Congratulations! Your products are now eligible for marketplace listing.
                  </p>
                </div>
              )}
              
              {userProfile.marketplace_application.marketplace_status === 'denied' && (
                <div>
                  <div style={{
                    padding: '15px',
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '2px',
                    marginBottom: '15px'
                  }}>
                    <strong>Application Not Approved</strong>
                    <p style={{ margin: '5px 0 0', color: '#721c24' }}>
                      {userProfile.marketplace_application.marketplace_admin_notes || 
                       'Your application was not approved. You may reapply with updated materials.'}
                    </p>
                  </div>
                  <button
                    onClick={handleSignupClick}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: 'linear-gradient(135deg, #055474 0%, #3E1C56 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    Reapply for Marketplace Access
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleSignupClick}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #055474 0%, #3E1C56 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Apply for Marketplace Access
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
        <h3 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>How it Works</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: '#e7f3ff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 15px',
              fontSize: '24px'
            }}>
              📝
            </div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>1. Apply</h4>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>
              Submit your application
            </p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: '#e7f3ff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 15px',
              fontSize: '24px'
            }}>
              ✅
            </div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>2. Get Approved</h4>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>
              Our team reviews your application and approves qualified artists and makers.
            </p>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              background: '#e7f3ff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 15px',
              fontSize: '24px'
            }}>
              🚀
            </div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>3. Start Selling</h4>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>
              Your products automatically appear in our custom curated marketplaces
            </p>
          </div>
        </div>
      </div>

      {/* Jury Application Modal */}
      {showSignupModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{ 
            maxWidth: '800px', 
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '30px',
            backgroundColor: 'white',
            borderRadius: '8px',
            margin: '20px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.8rem' }}>
                Marketplace Artist Application
              </h3>
              <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
                Complete your jury application to join our curated marketplace.
              </p>
              <div style={{ 
                background: '#e7f3ff', 
                padding: '15px', 
                borderRadius: '4px', 
                fontSize: '13px',
                color: '#055474',
                textAlign: 'left',
                lineHeight: '1.4'
              }}>
                <strong>Note:</strong> This information and media will be used to verify that your work is individually handcrafted. 
                If our jury staff has questions during the jury process we may contact you for additional information or proof of handcrafted work. 
                Acceptance to the marketplace is the sole discretion of Online Art Festival. Your cooperation in verification is greatly appreciated.
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
                background: '#d4edda', 
                padding: '10px 15px', 
                borderRadius: '4px', 
                marginBottom: '25px',
                fontSize: '13px',
                color: '#155724'
              }}>
                ✅ Terms accepted. Please complete your application below.
              </div>
            )}

            {/* Application Form - Only show after terms accepted */}
            {signupTermsAccepted && (
              <>
                {/* User Profile Information */}
                {userProfile && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '16px' }}>
                  Your Profile Information (This will be submitted with your application)
                </h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#495057',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ marginBottom: '10px' }}><strong>Email:</strong> {userProfile.username}</div>
                  {userProfile.first_name && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Name:</strong> {userProfile.first_name} {userProfile.last_name}
                    </div>
                  )}
                  {userProfile.business_name && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Business Name:</strong> {userProfile.business_name}
                    </div>
                  )}
                  {userProfile.phone && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Phone:</strong> {userProfile.phone}
                    </div>
                  )}
                  {(userProfile.address || userProfile.city || userProfile.state) && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Address:</strong> {[userProfile.address, userProfile.city, userProfile.state, userProfile.zip].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {userProfile.business_email && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Business Email:</strong> {userProfile.business_email}
                    </div>
                  )}
                  {userProfile.social_instagram && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Instagram:</strong> {userProfile.social_instagram}
                    </div>
                  )}
                  {userProfile.social_facebook && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Facebook:</strong> {userProfile.social_facebook}
                    </div>
                  )}
                  {userProfile.website && (
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Website:</strong> {userProfile.website}
                    </div>
                  )}
                </div>
                <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                  This information is pulled from your profile. To update it, please edit your profile settings before submitting this application.
                </small>
              </div>
            )}

            {/* Work Description */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                Please explain your work *
              </label>
              <textarea
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Describe your processes, materials, how you got started and any other relevant information to demonstrate the artistry and hand made nature of your products."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                required
              />
            </div>

            {/* Additional Information */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                Additional Information (Optional)
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Please add any other information you feel may be relevant or might help us verify you and your work."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Jury Materials - Images */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '16px' }}>
                Jury Materials - Images
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Raw Materials */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Raw Materials
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRawMaterials(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {rawMaterials && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {rawMaterials.name}</small>}
                </div>

                {/* Work in Process 1 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Work in Process 1
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setWorkInProcess1(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {workInProcess1 && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {workInProcess1.name}</small>}
                </div>

                {/* Work in Process 2 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Work in Process 2
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setWorkInProcess2(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {workInProcess2 && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {workInProcess2.name}</small>}
                </div>

                {/* Work in Process 3 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Work in Process 3
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setWorkInProcess3(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {workInProcess3 && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {workInProcess3.name}</small>}
                </div>

                {/* Artist at Work */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Artist at Work
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setArtistAtWork(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {artistAtWork && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {artistAtWork.name}</small>}
                </div>

                {/* Booth/Display */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Booth or Public Display
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBoothDisplay(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {boothDisplay && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {boothDisplay.name}</small>}
                </div>
              </div>
            </div>

            {/* Jury Videos (Optional) */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '16px' }}>
                Jury Videos (Optional)
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Artist Working Video */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Artist at Work Video
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setArtistWorkingVideo(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {artistWorkingVideo && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {artistWorkingVideo.name}</small>}
                </div>

                {/* Artist Bio Video */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Artist Video Bio
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setArtistBioVideo(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {artistBioVideo && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {artistBioVideo.name}</small>}
                </div>

                {/* Additional Video */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                    Additional Video
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setAdditionalVideo(e.target.files[0])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {additionalVideo && <small style={{ color: '#28a745', fontSize: '12px' }}>✓ {additionalVideo.name}</small>}
                </div>
              </div>
            </div>


            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  setSignupTermsAccepted(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplicationSubmit}
                disabled={!signupTermsAccepted || !workDescription.trim() || processing}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: (!signupTermsAccepted || !workDescription.trim() || processing) ? '#ccc' : '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: (!signupTermsAccepted || !workDescription.trim() || processing) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Submitting Application...' : 'Submit Jury Application'}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footnote */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '2px',
        fontSize: '12px',
        color: '#6c757d',
        lineHeight: '1.4'
      }}>
        <strong>*</strong> Some addons and third-party marketplace connections may have additional fees or commission structures. 
        Shipping label discounts, custom product services, and premium addon features may have separate charges. 
        See individual addon terms for complete pricing details.
      </div>
    </div>
  );
}

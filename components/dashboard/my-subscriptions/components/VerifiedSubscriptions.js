import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import VerifiedPricingTiers from './verified-components/VerifiedPricingTiers';

export default function VerifiedSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Module access state
  const [moduleState, setModuleState] = useState('loading'); // 'loading', 'dashboard', 'terms-required', 'signup'
  const [termsData, setTermsData] = useState(null);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);

  // Payment info state
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);

  // Verified data state
  const [verifiedPermission, setVerifiedPermission] = useState(null);
  const [verifiedStats, setVerifiedStats] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [userAddons, setUserAddons] = useState([]);

  useEffect(() => {
    checkModuleAccess();
  }, [userData]);

  const checkModuleAccess = async () => {
    try {
      setLoading(true);
      
      // Step 1: Check permission from JWT (source of truth)
      const hasVerifiedPermission = userData?.permissions?.includes('verified');
      
      if (hasVerifiedPermission) {
        // Step 2: User has verified permission - check if they've accepted latest verified terms
        try {
          const termsResponse = await authApiRequest('api/subscriptions/verified/terms-check');
          
          if (termsResponse.ok) {
            const termsData = await termsResponse.json();
            
            if (termsData.termsAccepted) {
              // All good - show dashboard
              setModuleState('dashboard');
              fetchVerifiedData();
              fetchSubscriptionData();
            } else {
              // User has verified permission (likely from marketplace approval) but hasn't accepted verified-specific terms
              // Show terms acceptance for verified subscription
              setModuleState('terms-required');
              setTermsData(termsData.latestTerms);
            }
          } else if (termsResponse.status === 404) {
            // No verified terms exist yet - show dashboard
            setModuleState('dashboard');
            fetchVerifiedData();
            fetchSubscriptionData();
          } else {
            // Terms check failed - default to dashboard (graceful degradation)
            setModuleState('dashboard');
            fetchVerifiedData();
            fetchSubscriptionData();
          }
        } catch (termsError) {
          console.error('Error checking verified terms:', termsError);
          // Terms endpoint might not exist yet - default to dashboard
          setModuleState('dashboard');
          fetchVerifiedData();
          fetchSubscriptionData();
        }
      } else {
        // Step 3: No permission - show signup workflow
        setModuleState('signup');
      }
      
    } catch (error) {
      console.error('Error checking verified access:', error);
      // Graceful fallback based on permission
      const hasVerifiedPermission = userData?.permissions?.includes('verified');
      setModuleState(hasVerifiedPermission ? 'dashboard' : 'signup');
      if (hasVerifiedPermission) {
        fetchVerifiedData();
        fetchSubscriptionData();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedData = async () => {
    try {
      // For now, just set basic verified stats
      // In the future, this could fetch verification status, expiry dates, etc.
      setVerifiedStats({
        status: 'active',
        verifiedDate: new Date().toISOString(),
        expiryDate: null // Verified status doesn't expire by default
      });
    } catch (error) {
      console.error('Error fetching verified data:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      // Verified subscriptions are typically free/one-time
      // This could be expanded to include premium verification tiers
      setSubscriptionData({
        type: 'verified',
        status: 'active',
        plan: 'Artist Verification',
        monthlyPrice: 0, // Free after approval
        features: ['Verified Badge', 'Enhanced Profile', 'Priority Support']
      });
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const handleTermsAcceptance = async () => {
    if (!termsData?.id) return;
    
    try {
      setProcessing(true);
      
      const response = await authApiRequest('api/subscriptions/verified/terms-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms_version_id: termsData.id
        })
      });
      
      if (response.ok) {
        // Terms accepted - show dashboard
        setModuleState('dashboard');
        fetchVerifiedData();
        fetchSubscriptionData();
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

  if (loading) {
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

  // Show signup workflow if user doesn't have verified permission
  if (moduleState === 'signup') {
    return (
      <div style={{ padding: '20px' }}>
        <VerifiedPricingTiers 
          userData={userData} 
          onSubscriptionSuccess={() => {
            // Refresh the module state after successful application
            checkModuleAccess();
          }}
        />
      </div>
    );
  }

  // Show terms modal if user has permission but hasn't accepted latest terms
  if (moduleState === 'terms-required') {
    return (
      <div style={{ padding: '20px' }}>
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                Verification Service Terms
              </h3>
              <p style={{ color: '#6c757d' }}>
                You already have verified status! Please review and accept the verification service terms to access your verified dashboard.
              </p>
            </div>

            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '2px',
              marginBottom: '30px',
              border: '1px solid #dee2e6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>
                {termsData?.title || 'Verification Service Terms'}
              </h4>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '14px' }}>
                {termsData?.content || 'Loading terms content...'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={signupTermsAccepted}
                  onChange={(e) => setSignupTermsAccepted(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '2px' }}
                />
                <span style={{ color: '#495057' }}>
                  I agree to the updated verification service terms and conditions.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={handleTermsAcceptance}
                disabled={!signupTermsAccepted || processing}
                style={{
                  flex: 1,
                  background: !signupTermsAccepted || processing ? '#6c757d' : '#055474',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '2px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: !signupTermsAccepted || processing ? 'not-allowed' : 'pointer'
                }}
              >
                {processing ? 'Accepting...' : 'Accept Terms'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show verified dashboard for users with active verified status
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          Artist Verification Dashboard
        </h2>
        <p style={{ color: '#6c757d' }}>
          Manage your verified artist status and access premium features.
        </p>
      </div>

      {/* Verification Status Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
        padding: '25px', 
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #c3e6cb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ 
            background: '#28a745',
            color: 'white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '15px',
            fontSize: '20px'
          }}>
            ✓
          </div>
    <div>
            <h3 style={{ margin: 0, color: '#155724' }}>Verified Artist Status</h3>
            <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
              Your account has been verified and you have access to all premium features.
            </p>
          </div>
        </div>
        
        {verifiedStats && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            padding: '15px', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0 0 5px 0', color: '#155724' }}>
              <strong>Status:</strong> Active
            </p>
            {verifiedStats.verifiedDate && (
              <p style={{ margin: '0 0 5px 0', color: '#155724' }}>
                <strong>Verified:</strong> {new Date(verifiedStats.verifiedDate).toLocaleDateString()}
              </p>
            )}
            <p style={{ margin: 0, color: '#155724' }}>
              <strong>Benefits:</strong> Verified badge, enhanced profile, priority support
            </p>
          </div>
        )}
      </div>

      {/* Verification Features */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '25px', 
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
          Your Verification Benefits
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Verified Badge</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Your profile and listings display a verified checkmark, building trust with collectors.
            </p>
          </div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Enhanced Profile</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Access to advanced profile customization options and detailed analytics.
            </p>
          </div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ color: '#055474', marginBottom: '10px' }}>✓ Priority Support</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
              Get faster response times and dedicated support for your account needs.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        background: 'white', 
        padding: '25px', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open('/profile', '_blank')}
            style={{
              background: '#055474',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '2px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            View My Profile
          </button>
          <button
            onClick={() => window.open('/dashboard', '_blank')}
            style={{
              background: 'transparent',
              color: '#055474',
              border: '1px solid #055474',
              padding: '10px 20px',
              borderRadius: '2px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Dashboard Home
          </button>
        </div>
      </div>
    </div>
  );
}

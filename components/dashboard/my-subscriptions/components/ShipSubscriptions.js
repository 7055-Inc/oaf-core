// Shipping Subscription Component - Progressive Checklist Approach
// Users complete requirements progressively: Card → Terms → Access

import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import StripeCardSetup from '../../../stripe/StripeCardSetup';

// Add spin animation for loading spinner
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

export default function ShipSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState({
    hasValidCard: false,
    hasAcceptedTerms: false,
    hasPermission: false
  });
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAllRequirements();
  }, [userData]);

  const checkAllRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check current permission status
      const hasPermission = userData?.permissions?.includes('shipping') || false;
      
      // Always check subscription status to get complete picture
        const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/my');
      
        if (response.ok) {
          const data = await response.json();
          
        // User has active subscription - use real API data
        setRequirements({
          hasValidCard: data.subscription?.cardLast4 !== null,
          hasAcceptedTerms: data.subscription?.termsAccepted || false,
          hasPermission: data.has_permission || false
        });
        setSubscriptionData(data);
        
      } else {
        // No active subscription found
        const data = await response.json();
        
        setRequirements({
          hasValidCard: false, // No active subscription = no valid card setup yet
          hasAcceptedTerms: false, // No subscription = no terms accepted yet  
          hasPermission: data.has_permission || false
        });
      }
      
    } catch (error) {
      console.error('Error checking requirements:', error);
      setError('Failed to load shipping subscription status');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    checkAllRequirements();
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Loading shipping subscription...</p>
      </div>
    );
  }

  if (error) {
  return (
      <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #dc3545', borderRadius: '5px', backgroundColor: '#f8d7da' }}>
        <h3 style={{ color: '#721c24' }}>Error</h3>
        <p style={{ color: '#721c24' }}>{error}</p>
        <button onClick={refreshData} style={{ 
          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 50%, var(--primary-color) 100%)',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          Try Again
        </button>
      </div>
    );
  }

  // Progressive checklist logic
  const allRequirementsMet = requirements.hasValidCard && 
                            requirements.hasAcceptedTerms && 
                            requirements.hasPermission;

  if (allRequirementsMet) {
    return (
        <ShippingDashboard 
          subscriptionData={subscriptionData}
        onUpdate={refreshData}
      />
    );
  }

  // Show requirements checklist and collection forms
  return (
    <RequirementsChecklist 
      requirements={requirements}
      userData={userData}
      onComplete={refreshData}
    />
  );
}

// Requirements Checklist Component
function RequirementsChecklist({ requirements, userData, onComplete }) {
  const [currentStep, setCurrentStep] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Determine which step to show first
    if (!requirements.hasValidCard) {
      setCurrentStep('card');
    } else if (!requirements.hasAcceptedTerms) {
      setCurrentStep('terms');
    } else {
      setCurrentStep('complete');
    }
  }, [requirements]);

  const nextRequirement = () => {
    if (!requirements.hasValidCard) return 'card';
    if (!requirements.hasAcceptedTerms) return 'terms';
    return 'complete';
  };

  return (
    <div className="subscription-setup">
      <div className="setup-header">
        <h2>Shipping Labels Setup</h2>
        <p>Complete these steps to access shipping label creation:</p>
      </div>

      {/* Progress Checklist */}
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '5px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '24px', marginRight: '10px' }}>
            {requirements.hasValidCard ? '✅' : '□'}
          </span>
          <span style={{ fontWeight: requirements.hasValidCard ? 'bold' : 'normal', color: requirements.hasValidCard ? 'var(--success-color)' : 'var(--text-color)' }}>
            Valid payment method on file
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '24px', marginRight: '10px' }}>
            {requirements.hasAcceptedTerms ? '✅' : '□'}
          </span>
          <span style={{ fontWeight: requirements.hasAcceptedTerms ? 'bold' : 'normal', color: requirements.hasAcceptedTerms ? 'var(--success-color)' : 'var(--text-color)' }}>
            Shipping service terms accepted
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '24px', marginRight: '10px' }}>
            {requirements.hasPermission ? '✅' : '□'}
          </span>
          <span style={{ fontWeight: requirements.hasPermission ? 'bold' : 'normal', color: requirements.hasPermission ? 'var(--success-color)' : 'var(--text-color)' }}>
            Shipping access granted
          </span>
        </div>
      </div>

      {/* Current Step Form */}
      <div className="current-step">
        {currentStep === 'card' && (
          <CardSetupStep 
          userData={userData}
            onComplete={onComplete}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        )}
        
        {currentStep === 'terms' && (
          <TermsAcceptanceStep 
          userData={userData}
            onComplete={onComplete}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
        />
      )}
      </div>
    </div>
  );
}

// Card Setup Step
function CardSetupStep({ userData, onComplete, isProcessing, setIsProcessing }) {
  const [setupIntent, setSetupIntent] = useState(null);
  const [preferConnectBalance, setPreferConnectBalance] = useState(true);
  const [error, setError] = useState(null);
  const hasStripeConnect = userData?.permissions?.includes('stripe_connect') || false;

  const startCardSetup = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferConnectBalance: hasStripeConnect ? preferConnectBalance : false,
          acceptTerms: false // Just setting up card first
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.setup_intent) {
          setSetupIntent(data.setup_intent);
        } else {
          throw new Error('Failed to create payment setup');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start setup');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSuccess = () => {
    onComplete(); // This will refresh and move to next step
  };

  const handleCardError = (errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false);
  };

  if (setupIntent) {
    return (
      <div className="step-container">
        <div className="step-header">
          <h3>Step 1: Add Payment Method</h3>
          <p>Add a secure payment method for shipping label purchases.</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <StripeCardSetup
          setupIntent={setupIntent}
          onSuccess={handleCardSuccess}
          onError={handleCardError}
          processing={isProcessing}
          setProcessing={setIsProcessing}
        />
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="step-header">
        <h3>Step 1: Add Payment Method</h3>
        <p>You'll need a payment method on file to purchase shipping labels.</p>
      </div>

      <div className="step-content">
        <div className="feature-list">
          <h4>Shipping Service Features:</h4>
          <ul>
            <li>Pay-as-you-go pricing (no monthly fees)</li>
            <li>Instant label generation</li>
            <li>Multiple carrier options</li>
            <li>Automatic tracking updates</li>
          </ul>
        </div>

        {hasStripeConnect && (
          <div className="preference-section">
            <h4>Payment Preferences</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferConnectBalance}
                onChange={(e) => setPreferConnectBalance(e.target.checked)}
              />
              Use Connect balance first (when available)
            </label>
            <p className="help-text">
              When enabled, we'll use your Connect earnings before charging your card.
            </p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={startCardSetup}>
          <button 
            type="submit" 
            disabled={isProcessing}
            className="btn btn-primary btn-large"
          >
            {isProcessing ? 'Setting up...' : 'Add Payment Method'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Terms Acceptance Step
function TermsAcceptanceStep({ userData, onComplete, isProcessing, setIsProcessing }) {
  const [error, setError] = useState(null);
  const [termsContent, setTermsContent] = useState(null);
  const [loadingTerms, setLoadingTerms] = useState(true);

  useEffect(() => {
    fetchTermsContent();
  }, []);

  const fetchTermsContent = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/terms');
      
      if (response.ok) {
        const data = await response.json();
        setTermsContent(data.terms);
      } else {
        console.error('Failed to fetch terms content');
        setError('Failed to load terms content');
      }
    } catch (error) {
      console.error('Error fetching terms:', error);
      setError('Failed to load terms content');
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleTermsAcceptance = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // Use the new dedicated terms acceptance endpoint
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: window.location.hostname, // Simple IP tracking
          user_agent: navigator.userAgent
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If terms acceptance activated the subscription, we're done
        if (data.activated) {
          onComplete(); // Refresh to show dashboard
        } else {
          // Terms accepted but subscription not activated yet (missing card/permission)
          // This will trigger a refresh and move to next step
          onComplete();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept terms');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h3>Step 2: Accept Service Terms</h3>
        <p>Review and accept the shipping service terms to activate your subscription.</p>
      </div>

      <div className="step-content">
        <div className="terms-section">
          <h4>Shipping Service Agreement</h4>
          <div className="terms-box">
            {loadingTerms ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid var(--primary-color)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 10px'
                }}></div>
                <p>Loading terms...</p>
              </div>
            ) : termsContent ? (
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                {termsContent.content}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
                <p>Unable to load terms content. Please try refreshing the page.</p>
              </div>
            )}
      </div>
        </div>

      

      {error && (
          <div className="error-message">
            {error}
        </div>
      )}

        <form onSubmit={handleTermsAcceptance}>
          <div className="terms-acceptance">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>
                I agree to the shipping service terms and authorize charges for shipping labels purchased using my payment method on file.
            </span>
          </label>
        </div>

        <button 
          type="submit" 
          disabled={isProcessing}
            className="btn btn-primary btn-large"
        >
          {isProcessing ? 'Activating...' : 'Activate Shipping Labels'}
        </button>
      </form>
      </div>
    </div>
  );
}

// Shipping Dashboard (for users with all requirements met)
function ShippingDashboard({ subscriptionData, onUpdate }) {
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your shipping subscription? You can reactivate it anytime.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/cancel', {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Shipping subscription canceled successfully.');
        onUpdate();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleConnectBalance = async () => {
    setIsProcessing(true);
    try {
      const newPreference = !subscriptionData?.subscription?.preferConnectBalance;
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferConnectBalance: newPreference
        })
      });
      
      if (response.ok) {
        onUpdate(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showUpdatePayment) {
    return (
      <PaymentMethodUpdate 
        onSuccess={() => {
          setShowUpdatePayment(false);
          onUpdate();
        }}
        onCancel={() => setShowUpdatePayment(false)}
      />
    );
  }

  return (
    <div className="shipping-dashboard">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Subscription Info */}
      <div className="section-box" style={{ marginTop: '10px' }}>
        <h3>Subscription Details</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Payment Method:</label>
            <span>•••• •••• •••• {subscriptionData?.subscription?.cardLast4 || 'None'}</span>
          </div>
          <div className="info-item">
            <label>Status:</label>
            <span className="status-active">{subscriptionData?.subscription?.status || 'Unknown'}</span>
          </div>
          {subscriptionData?.subscription?.hasStripeConnect && (
            <div className="info-item">
              <label>Deduct from Payout Balance if available:</label>
              <span>{subscriptionData?.subscription?.preferConnectBalance ? 'Enabled' : 'Disabled'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="action-buttons">
          <button 
            onClick={() => setShowUpdatePayment(true)}
            disabled={isProcessing}
            className="secondary"
          >
            Update Payment Method
          </button>
          
          {subscriptionData?.subscription?.hasStripeConnect && (
            <button 
              onClick={toggleConnectBalance}
              disabled={isProcessing}
              className="secondary"
            >
              {subscriptionData?.subscription?.preferConnectBalance ? 'Disable' : 'Enable'} Balance-First Payments
            </button>
          )}
          
                    <button 
            onClick={handleCancelSubscription}
            disabled={isProcessing}
            className="secondary"
          >
            Cancel Subscription
          </button>
      </div>

      {/* Recent Purchases */}
      <div className="purchases-card">
        <h3>Recent Label Purchases</h3>
        {subscriptionData?.card_purchases?.length > 0 || subscriptionData?.connect_purchases?.length > 0 ? (
          <PurchaseHistory 
            cardPurchases={subscriptionData.card_purchases || []}
            connectPurchases={subscriptionData.connect_purchases || []}
          />
        ) : (
          <div className="empty-state">
            <p>No shipping labels purchased yet.</p>
            <a href="/shipping" className="btn btn-primary">
              Create Your First Label
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Purchase History Component
function PurchaseHistory({ cardPurchases, connectPurchases }) {
  // Combine and sort purchases
  const allPurchases = [
    ...cardPurchases.map(p => ({ ...p, source: 'card' })),
    ...connectPurchases.map(p => ({ ...p, source: 'connect' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

  return (
    <div className="purchase-list">
      {allPurchases.map((purchase) => (
        <div key={`${purchase.source}_${purchase.id}`} className="purchase-item">
          <div className="purchase-details">
            <div className="purchase-main">
              <span className="purchase-amount">${parseFloat(purchase.amount).toFixed(2)}</span>
              <span className="purchase-tracking">{purchase.tracking_number}</span>
            </div>
            <div className="purchase-meta">
              <span className="purchase-date">
                {new Date(purchase.created_at).toLocaleDateString()}
              </span>
              <span className="purchase-carrier">{purchase.carrier}</span>
              <span className="purchase-status">{purchase.status}</span>
            </div>
          </div>
          <div className={`payment-badge ${purchase.source}`}>
            {purchase.source === 'connect' ? 'Connect' : 'Card'}
          </div>
        </div>
      ))}
    </div>
  );
}

// Payment Method Update Component
function PaymentMethodUpdate({ onSuccess, onCancel }) {
  const [setupIntent, setSetupIntent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    createUpdateIntent();
  }, []);

  const createUpdateIntent = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/update-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setSetupIntent(data.setup_intent);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create update intent');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateSuccess = () => {
    onSuccess();
  };

  const handleUpdateError = (errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false);
  };

  return (
    <div className="payment-update">
      <div className="step-header">
        <h3>Update Payment Method</h3>
        <p>Add a new payment method for your shipping subscription.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {setupIntent ? (
          <StripeCardSetup
            setupIntent={setupIntent}
          onSuccess={handleUpdateSuccess}
          onError={handleUpdateError}
            processing={isProcessing}
            setProcessing={setIsProcessing}
          />
      ) : (
        <div className="loading-container">
          <p>Preparing payment method update...</p>
            </div>
          )}

      <div className="action-buttons">
          <button 
          onClick={onCancel}
            disabled={isProcessing}
          className="btn btn-secondary"
        >
          ← Back to Dashboard
          </button>
      </div>
    </div>
  );
}
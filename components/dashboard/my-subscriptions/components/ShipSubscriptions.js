// Shipping Subscription Component - Progressive Checklist Approach
// Users complete requirements progressively: Card → Terms → Access

import { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
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

export default function ShipSubscriptions({ userData, onComplete }) {
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading user data...</div>;
  }
  
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState({
    hasValidCard: false,
    hasAcceptedTerms: false,
    hasPermission: false
  });
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userData) {
      checkAllRequirements();
    }
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
          userData={userData}
        onUpdate={refreshData}
        onComplete={onComplete}
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
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading user data...</div>;
  }
  
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
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading user data...</div>;
  }
  
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
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading user data...</div>;
  }
  
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
        
        // Force token refresh to get updated permissions
        await refreshAuthToken();
        
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
function ShippingDashboard({ subscriptionData, userData, onUpdate, onComplete }) {
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
          {onComplete && (
            <button 
              onClick={onComplete}
              className="primary"
              style={{ marginBottom: '10px' }}
            >
              ✓ Setup Complete - Start Creating Labels
            </button>
          )}
          
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

      {/* Standalone Label Creator */}
      <div className="section-box" style={{ marginTop: '20px' }}>
        <h3>Create Shipping Label</h3>
        <p>Create labels for packages not tied to specific orders.</p>
        <StandaloneLabelCreator userData={userData} onUpdate={onUpdate} />
      </div>

      {/* Standalone Label Library */}
      <div className="section-box" style={{ marginTop: '20px' }}>
        <h3>Standalone Label Library</h3>
        <p>Your standalone shipping labels (not tied to specific orders)</p>
        <StandaloneLabelLibrary />
      </div>
    </div>
  );
}

// Standalone Label Creator Component (duplicated from ManageOrders)
function StandaloneLabelCreator({ userData, onUpdate }) {
  // Add defensive check for userData
  if (!userData) {
    return <div>Loading...</div>;
  }
  
  const [packages, setPackages] = useState([{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [showAllRates, setShowAllRates] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [forceCardPayment, setForceCardPayment] = useState(false);
  const [shipperAddress, setShipperAddress] = useState({
    name: '',
    street: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: ''
  });
  const [recipientAddress, setRecipientAddress] = useState({
    name: '',
    street: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  // Load vendor address on mount
  useEffect(() => {
    loadVendorAddress();
  }, []);

  const loadVendorAddress = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/vendor-address');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.has_vendor_address && data.address) {
          // Complete vendor address found - prefill
          setShipperAddress(data.address);
        } else if (data.incomplete_address) {
          // Partial vendor address - prefill what we have
          setShipperAddress(prev => ({ ...prev, ...data.incomplete_address }));
        }
        // If no vendor address, leave Ship From form blank
      }
    } catch (error) {
      console.error('Error loading vendor address:', error);
      // Continue with blank form if error
    }
  };

  const addPackage = () => {
    setPackages([...packages, { length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
  };

  const removePackage = (index) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index, field, value) => {
    const newPackages = packages.map((pkg, i) => i === index ? { ...pkg, [field]: value } : pkg);
    setPackages(newPackages);
  };

  const updateShipperAddress = (field, value) => {
    setShipperAddress(prev => ({ ...prev, [field]: value }));
  };

  const updateRecipientAddress = (field, value) => {
    setRecipientAddress(prev => ({ ...prev, [field]: value }));
  };

  const fetchRates = async () => {
    setError(null);
    setIsProcessing(true);
    
    try {
      // Validate packages
      const validPackages = packages.filter(pkg => 
        pkg.length && pkg.width && pkg.height && pkg.weight
      );
      
      if (validPackages.length === 0) {
        throw new Error('Please fill in at least one complete package');
      }

      // Validate addresses
      if (!shipperAddress.name || !shipperAddress.street || !shipperAddress.city || !shipperAddress.state || !shipperAddress.zip) {
        throw new Error('Please fill in complete Ship From address');
      }
      
      if (!recipientAddress.name || !recipientAddress.street || !recipientAddress.city || !recipientAddress.state || !recipientAddress.zip) {
        throw new Error('Please fill in complete Ship To address');
      }

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/shipping/calculate-cart-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: [{ product_id: 'test', quantity: 1 }],
          recipient_address: recipientAddress,
          test_packages: validPackages.map(pkg => ({
            length: parseFloat(pkg.length),
            width: parseFloat(pkg.width),
            height: parseFloat(pkg.height),
            weight: parseFloat(pkg.weight),
            dimension_unit: pkg.dimUnit,
            weight_unit: pkg.weightUnit
          }))
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch rates');
      
        const data = await response.json();
      if (data.shipping_results && data.shipping_results[0] && data.shipping_results[0].available_rates) {
        setRates(data.shipping_results[0].available_rates);
        setSelectedRate(data.shipping_results[0].available_rates[0] || null);
        } else {
        throw new Error('No rates available for this shipment');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const purchaseLabel = async () => {
    if (!selectedRate) {
      setError('Please select a shipping rate');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // First create the label via subscription payment system
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/create-standalone-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipper_address: shipperAddress,
          recipient_address: recipientAddress,
          packages: packages.filter(pkg => pkg.length && pkg.width && pkg.height && pkg.weight),
          selected_rate: selectedRate,
          force_card_payment: forceCardPayment
        })
      });
      
      if (!response.ok) throw new Error('Failed to create label');
      
        const data = await response.json();
      
      if (data.success) {
        // Reset form (keep Ship From address, clear Ship To and packages)
        setPackages([{ length: '', width: '', height: '', dimUnit: 'in', weight: '', weightUnit: 'lb' }]);
        setRates([]);
        setSelectedRate(null);
        setRecipientAddress({
          name: '',
          street: '',
          address_line_2: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        });
        // Keep shipperAddress for convenience (don't reset)
        
        // Refresh dashboard data
        onUpdate();
        
        alert('Label created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create label');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="standalone-label-creator">
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '4px', 
          marginBottom: '15px',
          color: '#721c24'
        }}>
          {error}
      </div>
      )}

      {/* Shipper Address */}
      <div className="address-section" style={{ marginBottom: '20px' }}>
        <h4>Ship From Address</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Company/Sender Name *"
            value={shipperAddress.name}
            onChange={(e) => updateShipperAddress('name', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Street Address *"
            value={shipperAddress.street}
            onChange={(e) => updateShipperAddress('street', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={shipperAddress.address_line_2}
            onChange={(e) => updateShipperAddress('address_line_2', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="City *"
            value={shipperAddress.city}
            onChange={(e) => updateShipperAddress('city', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="State *"
            value={shipperAddress.state}
            onChange={(e) => updateShipperAddress('state', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="ZIP Code *"
            value={shipperAddress.zip}
            onChange={(e) => updateShipperAddress('zip', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={shipperAddress.country}
            onChange={(e) => updateShipperAddress('country', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
          <input
            type="tel"
            placeholder="Phone (Optional)"
            value={shipperAddress.phone}
            onChange={(e) => updateShipperAddress('phone', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Recipient Address */}
      <div className="address-section" style={{ marginBottom: '20px' }}>
        <h4>Ship To Address</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <input
            type="text"
            placeholder="Recipient Name"
            value={recipientAddress.name}
            onChange={(e) => updateRecipientAddress('name', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Street Address"
            value={recipientAddress.street}
            onChange={(e) => updateRecipientAddress('street', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Address Line 2 (Optional)"
            value={recipientAddress.address_line_2}
            onChange={(e) => updateRecipientAddress('address_line_2', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="City"
            value={recipientAddress.city}
            onChange={(e) => updateRecipientAddress('city', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
          <input
            type="text"
            placeholder="State"
            value={recipientAddress.state}
            onChange={(e) => updateRecipientAddress('state', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={recipientAddress.zip}
            onChange={(e) => updateRecipientAddress('zip', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={recipientAddress.country}
            onChange={(e) => updateRecipientAddress('country', e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </div>
      </div>

      {/* Package Dimensions */}
      <div className="packages-section" style={{ marginBottom: '20px' }}>
        <h4>Package Details</h4>
        {packages.map((pkg, index) => (
          <div key={index} className="package-row" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr) auto',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <input 
              type="number" 
              placeholder="Length" 
              value={pkg.length} 
              onChange={e => updatePackage(index, 'length', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <input 
              type="number" 
              placeholder="Width" 
              value={pkg.width} 
              onChange={e => updatePackage(index, 'width', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <input 
              type="number" 
              placeholder="Height" 
              value={pkg.height} 
              onChange={e => updatePackage(index, 'height', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <select 
              value={pkg.dimUnit} 
              onChange={e => updatePackage(index, 'dimUnit', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            >
              <option value="in">in</option>
              <option value="cm">cm</option>
            </select>
            <input 
              type="number" 
              placeholder="Weight" 
              value={pkg.weight} 
              onChange={e => updatePackage(index, 'weight', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <select 
              value={pkg.weightUnit} 
              onChange={e => updatePackage(index, 'weightUnit', e.target.value)}
              style={{ padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }}
            >
              <option value="lb">lb</option>
              <option value="oz">oz</option>
              <option value="kg">kg</option>
            </select>
            {index > 0 && (
              <button 
                onClick={() => removePackage(index)}
                className="secondary"
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className="secondary" 
            onClick={addPackage}
            disabled={isProcessing}
          >
            Add Another Package
          </button>
          <button 
            className="secondary" 
            onClick={fetchRates}
            disabled={isProcessing}
          >
            {isProcessing ? 'Getting Rates...' : 'Get Shipping Rates'}
          </button>
        </div>
      </div>

      {/* Rate Selection */}
      {rates.length > 0 && (
        <div className="rates-section" style={{ marginBottom: '20px' }}>
          <h4>Choose Shipping Rate:</h4>
          <div className="rates-list">
            {(showAllRates ? rates : rates.slice(0, 3)).map(rate => (
              <div key={rate.service} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                marginBottom: '8px',
                backgroundColor: selectedRate?.service === rate.service ? '#e3f2fd' : '#fff'
              }}>
                <input
                  type="radio" 
                  checked={selectedRate?.service === rate.service}
                  onChange={() => setSelectedRate(rate)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontWeight: '500' }}>{rate.service}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>${rate.cost.toFixed(2)}</span>
              </div>
            ))}
            {!showAllRates && rates.length > 3 && (
              <button 
                onClick={() => setShowAllRates(true)}
                style={{ color: '#007bff', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
              >
                See more shipping options
              </button>
            )}
          </div>

          {/* Payment Method Override */}
          {userData?.permissions?.includes('stripe_connect') && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px' 
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={forceCardPayment}
                  onChange={(e) => setForceCardPayment(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
            <span style={{ fontSize: '14px' }}>
                  Charge my card directly (bypass Connect balance)
            </span>
          </label>
              <p style={{ 
                fontSize: '12px', 
                color: '#6c757d', 
                margin: '5px 0 0 24px' 
              }}>
                {forceCardPayment 
                  ? 'This label will be charged to your card on file'
                  : 'This label will be deducted from your Connect balance if available, otherwise charged to your card'
                }
              </p>
        </div>
          )}

        <button 
            className="primary" 
            onClick={purchaseLabel}
            disabled={isProcessing || !selectedRate}
            style={{ marginTop: '15px' }}
          >
            {isProcessing ? 'Creating Label...' : `Purchase Label - $${selectedRate?.cost?.toFixed(2) || '0.00'}`}
        </button>
        </div>
      )}
    </div>
  );
}

// Standalone Label Library Component
function StandaloneLabelLibrary() {
  const [standaloneLabels, setStandaloneLabels] = useState([]);
  const [selectedStandaloneLabels, setSelectedStandaloneLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStandaloneLabels();
  }, []);

  const fetchStandaloneLabels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/shipping/standalone-labels', {
        method: 'GET'
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Standalone API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 403) {
          console.log('No permission for standalone labels');
          setStandaloneLabels([]);
          return;
        } else if (response.status === 500) {
          console.log('Server error for standalone labels');
          setStandaloneLabels([]);
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setStandaloneLabels(data.labels || []);
      } else {
        console.error('Error fetching standalone labels:', data.error);
        setStandaloneLabels([]);
      }
    } catch (error) {
      console.error('Error fetching standalone labels:', error);
      setStandaloneLabels([]);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <div>Loading standalone labels...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#dc3545', marginBottom: '15px' }}>Error: {error}</p>
        <button 
          className="secondary" 
          onClick={fetchStandaloneLabels}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Retry Loading Standalone Labels
        </button>
      </div>
    );
  }

  if (!standaloneLabels || standaloneLabels.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#6c757d', marginBottom: '15px' }}>No standalone labels found.</p>
        <button 
          className="secondary" 
          onClick={fetchStandaloneLabels}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Retry Loading Standalone Labels
        </button>
      </div>
    );
  }

  return (
    <div>
      {selectedStandaloneLabels.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
          <button 
            className="primary" 
            onClick={() => {
              // TODO: Implement standalone label printing
              alert('Standalone label printing coming soon!');
            }}
            style={{ marginRight: '10px' }}
          >
            Print Selected Standalone Labels ({selectedStandaloneLabels.length})
          </button>
          <button 
            className="secondary" 
            onClick={() => setSelectedStandaloneLabels([])}
          >
            Clear Selection
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
              <input 
                type="checkbox" 
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStandaloneLabels(standaloneLabels.map(l => l.db_id));
                  } else {
                    setSelectedStandaloneLabels([]);
                  }
                }}
                checked={selectedStandaloneLabels.length === standaloneLabels.length && standaloneLabels.length > 0}
              />
            </th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Label ID</th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Service</th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Tracking</th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Cost</th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Label</th>
          </tr>
        </thead>
        <tbody>
          {standaloneLabels.map(label => (
            <tr key={label.db_id} style={{ 
              borderBottom: '1px solid #ddd',
              textDecoration: label.status === 'voided' ? 'line-through' : 'none',
              opacity: label.status === 'voided' ? 0.6 : 1
            }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                <input 
                  type="checkbox" 
                  checked={selectedStandaloneLabels.includes(label.db_id)}
                  disabled={label.status === 'voided'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStandaloneLabels([...selectedStandaloneLabels, label.db_id]);
                    } else {
                      setSelectedStandaloneLabels(selectedStandaloneLabels.filter(id => id !== label.db_id));
                    }
                  }}
                />
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {label.label_id}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.service_name}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{label.tracking_number}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>${label.cost}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {new Date(label.created_at).toLocaleDateString()}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {label.status === 'voided' ? (
                  <>
                    <span style={{ color: '#6c757d', fontSize: '12px', marginRight: '10px' }}>VOIDED</span>
                    <span 
                      style={{ 
                        color: '#aaa', 
                        textDecoration: 'none', 
                        cursor: 'not-allowed',
                        fontSize: '14px'
                      }}
                    >
                      View Label
                    </span>
                  </>
                ) : (
                  <a 
                    href={label.label_file_path.includes('/user_') 
                      ? `https://api2.onlineartfestival.com/api/shipping/labels/${encodeURIComponent(label.label_file_path.split('/').pop())}`
                      : `https://main.onlineartfestival.com${label.label_file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'none' }}
                  >
                    View Label
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
        <small><strong>Note:</strong> Standalone labels are purchased independently and cannot be voided through this interface.</small>
      </div>
      
      {selectedStandaloneLabels.length > 0 && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
          <button 
            className="primary" 
            onClick={() => {
              // TODO: Implement standalone label printing
              alert('Standalone label printing coming soon!');
            }}
          >
            Print Selected Standalone Labels ({selectedStandaloneLabels.length})
          </button>
        </div>
      )}
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
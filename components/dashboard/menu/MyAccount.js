import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';


import styles from '../../../pages/dashboard/Dashboard.module.css';
import slideInStyles from '../SlideIn.module.css';
import profileStyles from '../../../pages/profile/Profile.module.css';

// Payment Management Component
function PaymentManagementContent({ userData, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendorSettings, setVendorSettings] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);

  useEffect(() => {
    fetchVendorSettings();
  }, []);

  const fetchVendorSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/settings', {
        method: 'GET'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch payment settings');
      }
      
      const data = await res.json();
      setVendorSettings(data.settings);
    } catch (err) {
      setError('Unable to load payment settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/stripe-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create Stripe account');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.stripe_account.onboarding_url;
    } catch (err) {
      setError('Unable to connect Stripe account. Please try again.');
      setActionLoading(false);
    }
  };

  const handleContinueSetup = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/stripe-onboarding', {
        method: 'GET'
      });
      
      if (!res.ok) {
        throw new Error('Failed to get onboarding link');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.onboarding_url;
    } catch (err) {
      setError('Unable to continue setup. Please try again.');
      setActionLoading(false);
    }
  };

  const handlePaymentPreferenceChange = async (useConnectBalance) => {
    try {
      setUpdatingPreferences(true);
      setError(null);
      
      const res = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/subscription-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
          reverse_transfer_enabled: useConnectBalance
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }
      
      // Update local state
      setVendorSettings(prev => ({
        ...prev,
        subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
        reverse_transfer_enabled: useConnectBalance
      }));
      
    } catch (err) {
      setError('Unable to update payment preferences. Please try again.');
    } finally {
      setUpdatingPreferences(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAccountStatus = () => {
    if (!vendorSettings?.stripe_account_id) {
      return { status: 'no-account', label: 'Not Connected', color: '#6c757d' };
    }
    if (!vendorSettings?.stripe_account_verified) {
      return { status: 'pending', label: 'Setup Required', color: 'var(--warning-color)' };
    }
    return { status: 'verified', label: 'Connected & Verified', color: 'var(--success-color)' };
  };

  const renderAccountStatus = () => {
    const accountStatus = getAccountStatus();
    
    return (
      <div className="section-box">
        <h3>Account Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: accountStatus.color 
            }}
          ></div>
          <span style={{ fontWeight: '500', fontSize: '16px' }}>
            {accountStatus.label}
          </span>
        </div>
        
        {vendorSettings?.stripe_account_id && (
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
            Account: {vendorSettings.stripe_account_id.substring(0, 12)}...
          </div>
        )}
      </div>
    );
  };

  const renderBalanceSection = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Balance & Earnings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Available</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.available_balance)}
            </div>
          </div>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Pending</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.pending_balance)}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Next Payout</div>
          <div style={{ fontSize: '14px' }}>
            {vendorSettings?.next_payout_date 
              ? `${formatDate(vendorSettings.next_payout_date)} • ${formatCurrency(vendorSettings.next_payout_amount)}`
              : 'No pending payouts'
            }
          </div>
        </div>
      </div>
    );
  };

  const renderPayoutSettings = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Payout Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Schedule</div>
            <div style={{ fontSize: '16px' }}>
              Every {vendorSettings?.payout_days || 15} days
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Commission Rate</div>
            <div style={{ fontSize: '16px' }}>
              {vendorSettings?.commission_rate || 15}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentPreferences = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    const useConnectBalance = vendorSettings?.subscription_payment_method === 'balance_first';
    
    return (
      <div className="section-box">
        <h3>Payment Preferences</h3>
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: updatingPreferences ? 0.6 : 1 }}>
            <input 
              type="checkbox"
              checked={useConnectBalance}
              onChange={(e) => handlePaymentPreferenceChange(e.target.checked)}
              disabled={updatingPreferences}
              style={{ marginTop: '2px', transform: 'scale(1.1)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                Use Connect balance for subscriptions
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {useConnectBalance 
                  ? 'Platform subscriptions will be paid from your Connect earnings first, then your card if needed.'
                  : 'Platform subscriptions will always be charged to your card.'
                }
              </div>
              {updatingPreferences && (
                <div style={{ fontSize: '12px', color: '#055474', marginTop: '4px' }}>
                  Updating preferences...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const accountStatus = getAccountStatus();
    
    if (accountStatus.status === 'no-account') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '16px', marginBottom: '16px', color: '#6c757d' }}>
              Connect your Stripe account to start receiving payments from your sales and services.
            </div>
            <button 
              onClick={handleConnectStripe}
              disabled={actionLoading}
            >
              {actionLoading ? 'Connecting...' : 'Connect Stripe Account'}
            </button>
            <div style={{ fontSize: '12px', color: '#8d8d8d', marginTop: '12px' }}>
              This process takes 2-3 minutes
            </div>
          </div>
        </div>
      );
    }
    
    if (accountStatus.status === 'pending') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="warning-alert">
              Your Stripe account needs additional information to start processing payments.
            </div>
            <button 
              onClick={handleContinueSetup}
              disabled={actionLoading}
              style={{ backgroundColor: 'var(--warning-color)' }}
            >
              {actionLoading ? 'Loading...' : 'Continue Setup'}
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="section-box">
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            onClick={handleContinueSetup}
            className="secondary"
          >
            Update Banking Info
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a 
            href={`https://dashboard.stripe.com/express/accounts/${vendorSettings?.stripe_account_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              fontSize: '11px', 
              color: '#8d8d8d', 
              textDecoration: 'none',
              borderBottom: '1px dotted #8d8d8d'
            }}
          >
            Click here to visit your stripe.com account
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
          <h2 className={slideInStyles.title}>Payment Management</h2>
        </div>
        <div className={slideInStyles.content}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '16px', color: '#6c757d' }}>Loading payment settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h2 className={slideInStyles.title}>Payment Management</h2>
      </div>
      <div className={slideInStyles.content}>
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: '24px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}
        
        {renderAccountStatus()}
        {renderBalanceSection()}
        {renderPayoutSettings()}
        {renderPaymentPreferences()}
        {renderActionButtons()}
      </div>
    </div>
  );
}

// Shipping Settings Content Component
function ShippingSettingsContent({ userData, onBack }) {
  const [preferences, setPreferences] = useState({
    return_company_name: '',
    return_contact_name: '',
    return_address_line_1: '',
    return_address_line_2: '',
    return_city: '',
    return_state: '',
    return_postal_code: '',
    return_country: 'US',
    return_phone: '',
    label_size_preference: '4x6',
    signature_required_default: false,
    insurance_default: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load existing preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Handle null values from database by converting to empty strings
            const cleanPreferences = {
              return_company_name: data.preferences.return_company_name || '',
              return_contact_name: data.preferences.return_contact_name || '',
              return_address_line_1: data.preferences.return_address_line_1 || '',
              return_address_line_2: data.preferences.return_address_line_2 || '',
              return_city: data.preferences.return_city || '',
              return_state: data.preferences.return_state || '',
              return_postal_code: data.preferences.return_postal_code || '',
              return_country: data.preferences.return_country || 'US',
              return_phone: data.preferences.return_phone || '',
              label_size_preference: data.preferences.label_size_preference || '4x6',
              signature_required_default: Boolean(data.preferences.signature_required_default),
              insurance_default: Boolean(data.preferences.insurance_default)
            };
            setPreferences(cleanPreferences);
          }
        }
      } catch (error) {
        console.error('Error loading shipping preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/shipping-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage('Shipping preferences saved successfully!');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Error saving preferences: ' + (data.error || 'Unknown error'));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage('Error saving preferences: ' + (errorData.error || `HTTP ${response.status}`));
      }
    } catch (error) {
      console.error('Error saving shipping preferences:', error);
      setMessage('Error saving preferences: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className={slideInStyles.container}>
        <div className={slideInStyles.header}>
          <button onClick={onBack} className={slideInStyles.backButton}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <div className={slideInStyles.content}>
          <h2>Loading shipping preferences...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={slideInStyles.container}>
      <div className={slideInStyles.header}>
        <button onClick={onBack} className={slideInStyles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
      </div>
      <div className={slideInStyles.content}>
        <h2>Shipping Settings</h2>
        
        {message && (
          <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', border: '1px solid ' + (message.includes('Error') ? '#f5c6cb' : '#c3e6cb'), borderRadius: '4px' }}>
            {message}
          </div>
        )}

        <div className="form-card">
          <h3>Return Address</h3>
          
          <label>Company Name</label>
          <input 
            type="text" 
            value={preferences.return_company_name} 
            onChange={(e) => handleInputChange('return_company_name', e.target.value)}
            placeholder="Your Company Name"
          />

          <label>Contact Name</label>
          <input 
            type="text" 
            value={preferences.return_contact_name} 
            onChange={(e) => handleInputChange('return_contact_name', e.target.value)}
            placeholder="Contact Person Name"
          />

          <label>Address Line 1 *</label>
          <input 
            type="text" 
            value={preferences.return_address_line_1} 
            onChange={(e) => handleInputChange('return_address_line_1', e.target.value)}
            placeholder="Street Address"
            required
          />

          <label>Address Line 2</label>
          <input 
            type="text" 
            value={preferences.return_address_line_2} 
            onChange={(e) => handleInputChange('return_address_line_2', e.target.value)}
            placeholder="Suite, Apt, etc. (optional)"
          />

          <label>City *</label>
          <input 
            type="text" 
            value={preferences.return_city} 
            onChange={(e) => handleInputChange('return_city', e.target.value)}
            placeholder="City"
            required
          />

          <label>State *</label>
          <input 
            type="text" 
            value={preferences.return_state} 
            onChange={(e) => handleInputChange('return_state', e.target.value)}
            placeholder="State/Province"
            required
          />

          <label>Postal Code *</label>
          <input 
            type="text" 
            value={preferences.return_postal_code} 
            onChange={(e) => handleInputChange('return_postal_code', e.target.value)}
            placeholder="ZIP/Postal Code"
            required
          />

          <label>Country</label>
          <select 
            value={preferences.return_country} 
            onChange={(e) => handleInputChange('return_country', e.target.value)}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>

          <label>Phone Number</label>
          <input 
            type="tel" 
            value={preferences.return_phone} 
            onChange={(e) => handleInputChange('return_phone', e.target.value)}
            placeholder="Phone Number"
          />
        </div>

        <div className="form-card">
          <h3>Label Preferences</h3>
          
          <label>Label Size</label>
          <select 
            value={preferences.label_size_preference} 
            onChange={(e) => handleInputChange('label_size_preference', e.target.value)}
          >
            <option value="4x6">4" x 6" (Standard)</option>
            <option value="8.5x11">8.5" x 11" (Full Page)</option>
          </select>

          <div className="form-group">
            <label className="toggle-slider-container">
              <input 
                type="checkbox" 
                className="toggle-slider-input"
                checked={preferences.signature_required_default} 
                onChange={(e) => handleInputChange('signature_required_default', e.target.checked)}
              />
              <div className="toggle-slider"></div>
              <span className="toggle-text">Require signature by default</span>
            </label>
          </div>

          <div className="form-group">
            <label className="toggle-slider-container">
              <input 
                type="checkbox" 
                className="toggle-slider-input"
                checked={preferences.insurance_default} 
                onChange={(e) => handleInputChange('insurance_default', e.target.checked)}
              />
              <div className="toggle-slider"></div>
              <span className="toggle-text">Add insurance by default</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ marginRight: '10px' }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button onClick={onBack}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Menu Section Component
export function MyAccountMenu({ 
  userData, 
  collapsedSections = {}, 
  toggleSection = () => {}, 
  openSlideIn = () => {} 
}) {


  if (!userData) return null;
  
  return (
    <div className={styles.sidebarSection}>
      <h3 
        className={`${styles.collapsibleHeader} ${collapsedSections.account ? styles.collapsed : ''}`}
        onClick={() => toggleSection('account')}
      >
        <span className={styles.accountHeader}>
          My Account
        </span>
      </h3>
      {!collapsedSections.account && (
        <ul>


          {(userData.permissions?.includes('stripe_connect') || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('payment-management')}
              >
                Payment Management
              </button>
            </li>
          )}
          {(userData.user_type === 'artist' || userData.user_type === 'promoter' || userData.user_type === 'admin') && (
            <li>
              <button 
                className={styles.sidebarLink}
                onClick={() => openSlideIn('shipping-settings')}
              >
                Shipping Settings
              </button>
            </li>
          )}

        </ul>
      )}
    </div>
  );
}

// Slide-in Content Renderer
export function MyAccountSlideIn({ 
  slideInContent, 
  userData, 
  closeSlideIn 
}) {
  if (!slideInContent || !userData) return null;

  switch (slideInContent.type) {
    case 'profile-view':
      return <ProfileViewContent userId={userData.id} onBack={closeSlideIn} />;
    case 'profile-edit':
      return <ProfileEditContent 
        userData={userData}
        onBack={closeSlideIn} 
        onSaved={() => {
          closeSlideIn();
          // Optionally refresh user data
        }} 
      />;
    case 'my-orders':
      return <MyOrdersContent userId={userData.id} onBack={closeSlideIn} />;

    case 'payment-management':
      return <PaymentManagementContent 
        userData={userData} 
        onBack={closeSlideIn} 
      />;
    case 'shipping-settings':
      return <ShippingSettingsContent 
        userData={userData} 
        onBack={closeSlideIn} 
      />;

    default:
      return null;
  }
}

// Helper to check if this menu handles a slide-in type
export const myAccountSlideInTypes = ['profile-view', 'profile-edit', 'payment-management', 'shipping-settings'];

// Default export for backward compatibility
export default MyAccountMenu; 
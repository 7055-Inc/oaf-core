/**
 * Subscription Manager - Tier changes and cancellations with confirmation modals
 * Shows users exactly what will be affected before proceeding with downgrades or cancellations
 */

import React, { useState, useEffect } from 'react';
import { 
  fetchWebsitesSubscription, 
  changeWebsitesTier, 
  confirmWebsitesTierChange,
  cancelWebsitesSubscription,
  confirmWebsitesCancellation 
} from '../../../lib/websites/api';

const { getAllTiersForDisplay } = require('../../../lib/websites/tierConfig');

export default function SubscriptionManager() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [availableTiers, setAvailableTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Confirmation modal states
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeInfo, setDowngradeInfo] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInfo, setCancelInfo] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWebsitesSubscription();
      setSubscription(data.subscription);
      const tiers = getAllTiersForDisplay();
      setAvailableTiers(tiers);
    } catch (err) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleTierSelect = async (tierName, tierPrice) => {
    if (subscription.tier === tierName) {
      setError('You are already on this tier');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await changeWebsitesTier({
        new_tier_name: tierName,
        new_tier_price: tierPrice
      });

      if (result.requires_confirmation) {
        // Show confirmation modal
        setDowngradeInfo(result);
        setSelectedTier({ name: tierName, price: tierPrice });
        setShowDowngradeModal(true);
      } else if (result.success) {
        // Tier changed successfully
        setSuccess('Subscription tier updated successfully!');
        await loadSubscriptionData();
      }
    } catch (err) {
      setError(err.message || 'Failed to change tier');
    } finally {
      setProcessing(false);
    }
  };

  const confirmTierChange = async () => {
    if (!selectedTier) return;

    setProcessing(true);
    setError('');

    try {
      const result = await confirmWebsitesTierChange({
        new_tier_name: selectedTier.name,
        new_tier_price: selectedTier.price,
        confirmed: true
      });

      if (result.success) {
        setShowDowngradeModal(false);
        setSuccess(`Tier changed successfully! ${result.sites_deactivated || 0} site(s) deactivated, ${result.addons_disabled || 0} addon(s) disabled.`);
        await loadSubscriptionData();
      }
    } catch (err) {
      setError(err.message || 'Failed to confirm tier change');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await cancelWebsitesSubscription();

      if (result.requires_confirmation) {
        // Show confirmation modal
        setCancelInfo(result);
        setShowCancelModal(true);
      } else if (result.success) {
        const cancelDate = result.cancelAt ? new Date(result.cancelAt).toLocaleDateString() : null;
        setSuccess(cancelDate
          ? `Subscription will cancel on ${cancelDate}. You retain full access until then.`
          : 'Subscription set to cancel at end of billing period.');
        await loadSubscriptionData();
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const confirmCancellation = async () => {
    setProcessing(true);
    setError('');

    try {
      const result = await confirmWebsitesCancellation({
        confirmed: true
      });

      if (result.success) {
        setShowCancelModal(false);
        const cancelDate = result.cancelAt ? new Date(result.cancelAt).toLocaleDateString() : null;
        setSuccess(cancelDate
          ? `Subscription will cancel on ${cancelDate}. Your ${result.sites_affected || 0} site(s) and ${result.addons_affected || 0} addon(s) remain active until then.`
          : 'Subscription set to cancel at end of billing period.');
        await loadSubscriptionData();
      }
    } catch (err) {
      setError(err.message || 'Failed to confirm cancellation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading subscription...</p>
      </div>
    );
  }

  if (!subscription || subscription.status !== 'active') {
    return (
      <div className="warning-alert">
        No active subscription found. Please subscribe to a plan first.
      </div>
    );
  }

  const currentTier = availableTiers.find(t => t.displayName === subscription.tier);

  return (
    <div>
      {/* Current Subscription */}
      <div className="form-card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Current Subscription</h3>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '4px',
          border: '2px solid #055474'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, color: '#2c3e50' }}>{subscription.tier}</h4>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                {currentTier?.description || ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#055474' }}>
                ${subscription.tierPrice ? subscription.tierPrice.toFixed(2) : '0.00'}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>per month</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-alert" style={{ marginBottom: '20px' }}>{error}</div>}
      {success && <div className="success-alert" style={{ marginBottom: '20px' }}>{success}</div>}

      {/* Available Tiers */}
      <div className="form-card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Change Subscription Tier</h3>
        <p className="form-help" style={{ marginBottom: '20px' }}>
          Select a different tier to upgrade or downgrade your subscription.
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          {availableTiers.map(tier => {
            const isCurrent = tier.displayName === subscription.tier;
            const tierPrice = typeof tier.price === 'number' ? tier.price : 0;
            
            return (
              <div
                key={tier.id}
                style={{
                  background: isCurrent ? '#e7f3ff' : 'white',
                  border: isCurrent ? '2px solid #055474' : '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '20px',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#055474',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    CURRENT
                  </div>
                )}
                
                <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>{tier.displayName}</h4>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: '#055474' }}>
                  ${tierPrice.toFixed(2)}
                  <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6c757d' }}>/mo</span>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '15px', fontSize: '14px' }}>
                  {tier.features.slice(0, 3).map((feature, i) => (
                    <li key={i} style={{ padding: '4px 0', color: '#495057' }}>
                      <span style={{ color: '#055474', marginRight: '8px' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleTierSelect(tier.displayName, tierPrice)}
                  disabled={isCurrent || processing}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: isCurrent ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isCurrent || processing ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {isCurrent ? 'Current Plan' : processing ? 'Processing...' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel Subscription */}
      <div className="form-card">
        <h3 style={{ marginBottom: '15px', color: '#dc3545' }}>Danger Zone</h3>
        <p className="form-help" style={{ marginBottom: '15px' }}>
          Cancel your subscription. Your sites and addons will remain active until the end of your billing period.
        </p>
        <button
          onClick={handleCancelSubscription}
          disabled={processing}
          style={{
            padding: '12px 24px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {processing ? 'Processing...' : 'Cancel Subscription'}
        </button>
      </div>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && downgradeInfo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '30px' }}>
            <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>
              ⚠️ Confirm Tier Change
            </h3>
            
            <p style={{ marginBottom: '20px', color: '#495057' }}>
              {downgradeInfo.message}
            </p>

            {/* Sites to be deactivated */}
            {downgradeInfo.sites_to_deactivate && downgradeInfo.sites_to_deactivate.length > 0 && (
              <div style={{ 
                background: '#fff3cd', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                border: '1px solid #ffc107'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                  Sites to be Deactivated ({downgradeInfo.sites_to_deactivate.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {downgradeInfo.sites_to_deactivate.map((site, idx) => (
                    <li key={idx} style={{ marginBottom: '5px', color: '#856404' }}>
                      <strong>{site.name}</strong>
                      <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                        (created {new Date(site.created_at).toLocaleDateString()})
                      </span>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#856404' }}>
                  Your {downgradeInfo.sites_to_deactivate.length} oldest site(s) will be deactivated.
                </p>
              </div>
            )}

            {/* Addons to be disabled */}
            {downgradeInfo.addons_to_disable && downgradeInfo.addons_to_disable.length > 0 && (
              <div style={{ 
                background: '#f8d7da', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                border: '1px solid #f5c2c7'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#842029' }}>
                  Addons to be Disabled ({downgradeInfo.addons_to_disable.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {downgradeInfo.addons_to_disable.map((addon, idx) => (
                    <li key={idx} style={{ marginBottom: '5px', color: '#842029' }}>
                      <strong>{addon.addon_name}</strong>
                      <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                        on {addon.site_name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reassurance message */}
            <div style={{ 
              background: '#d1ecf1', 
              padding: '15px', 
              borderRadius: '4px', 
              marginBottom: '20px',
              border: '1px solid #bee5eb'
            }}>
              <p style={{ margin: 0, color: '#0c5460' }}>
                <strong>Don't worry!</strong> Your data is preserved and can be reactivated anytime by upgrading back to {downgradeInfo.current_tier}.
              </p>
            </div>

            {/* New tier limits */}
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#6c757d' }}>
              Your new tier ({downgradeInfo.new_tier}) allows up to {downgradeInfo.new_site_limit} active site(s).
            </p>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowDowngradeModal(false);
                  setDowngradeInfo(null);
                  setSelectedTier(null);
                }}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmTierChange}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: processing ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Confirming...' : 'Confirm Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && cancelInfo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '30px' }}>
            <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>
              ⚠️ Confirm Subscription Cancellation
            </h3>
            
            <p style={{ marginBottom: '20px', color: '#495057' }}>
              {cancelInfo.message}
            </p>

            {/* Sites to be deactivated */}
            {cancelInfo.sites_to_deactivate && cancelInfo.sites_to_deactivate.length > 0 && (
              <div style={{ 
                background: '#fff3cd', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                border: '1px solid #ffc107'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                  Sites to be Deactivated ({cancelInfo.total_sites})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', maxHeight: '150px', overflowY: 'auto' }}>
                  {cancelInfo.sites_to_deactivate.map((site, idx) => (
                    <li key={idx} style={{ marginBottom: '5px', color: '#856404' }}>
                      <strong>{site.name}</strong>
                      <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                        (created {new Date(site.created_at).toLocaleDateString()})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Addons to be disabled */}
            {cancelInfo.addons_to_disable && cancelInfo.addons_to_disable.length > 0 && (
              <div style={{ 
                background: '#f8d7da', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                border: '1px solid #f5c2c7'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#842029' }}>
                  Addons to be Disabled ({cancelInfo.total_addons})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', maxHeight: '150px', overflowY: 'auto' }}>
                  {cancelInfo.addons_to_disable.map((addon, idx) => (
                    <li key={idx} style={{ marginBottom: '5px', color: '#842029' }}>
                      <strong>{addon.addon_name}</strong>
                      <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                        on {addon.site_name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reassurance message */}
            <div style={{ 
              background: '#d1ecf1', 
              padding: '15px', 
              borderRadius: '4px', 
              marginBottom: '20px',
              border: '1px solid #bee5eb'
            }}>
              <p style={{ margin: 0, color: '#0c5460' }}>
                <strong>Your data is preserved!</strong> You can reactivate sites and addons anytime by resubscribing.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelInfo(null);
                }}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Keep Subscription
              </button>
              <button
                onClick={confirmCancellation}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: processing ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

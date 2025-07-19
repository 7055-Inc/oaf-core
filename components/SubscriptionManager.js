import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './SubscriptionManager.module.css';

export default function SubscriptionManager({ user }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prices, setPrices] = useState([]);
  const [connectBalance, setConnectBalance] = useState({ available: 0, pending: 0, connect_account_id: null });
  
  // Form state
  const [personaCount, setPersonaCount] = useState(0);
  const [preferConnectBalance, setPreferConnectBalance] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchPrices();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await authenticatedApiRequest('/api/subscriptions/my', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setConnectBalance(data.connect_balance || { available: 0, pending: 0, connect_account_id: null });
        
        // Set payment preference from subscription data
        if (data.subscription && typeof data.subscription.prefer_connect_balance === 'boolean') {
          setPreferConnectBalance(data.subscription.prefer_connect_balance);
        }
      } else {
        throw new Error('Failed to fetch subscription');
      }
    } catch (err) {
      setError('Failed to load subscription data');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/subscriptions/prices');
      if (response.ok) {
        const data = await response.json();
        setPrices(data.prices);
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_count: personaCount,
          payment_method_id: null // Will implement payment method selection later
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.subscription.client_secret) {
          // Handle payment confirmation (Stripe Elements integration would go here)
          alert('Payment confirmation required - this would integrate with Stripe Elements');
        }
        
        await fetchSubscription();
        setShowSubscriptionForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePersonas = async (newCount) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('/api/subscriptions/update-personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_count: newCount })
      });

      if (response.ok) {
        await fetchSubscription();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async (immediately = false) => {
    if (!confirm(`Are you sure you want to ${immediately ? 'immediately cancel' : 'cancel at period end'} your verification subscription?`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately })
      });

      if (response.ok) {
        await fetchSubscription();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentPreferenceChange = async (newPreference) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest('/api/subscriptions/payment-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefer_connect_balance: newPreference })
      });

      if (response.ok) {
        const data = await response.json();
        setPreferConnectBalance(newPreference);
        setConnectBalance(data.connect_balance);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment preference');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatePrice = (personaCount) => {
    const basePrice = prices.find(p => p.type === 'verification_base');
    const personaPrice = prices.find(p => p.type === 'verification_persona');
    
    if (!basePrice || !personaPrice) return 0;
    
    return (basePrice.amount + (personaPrice.amount * personaCount)) / 100; // Convert from cents
  };

  const getCurrentPersonaCount = () => {
    if (!subscription?.subscription_items) return 0;
    const personaItem = subscription.subscription_items.find(item => item.item_type === 'verification_persona');
    return personaItem?.quantity || 0;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading subscription information...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          <i className="fas fa-certificate"></i>
          Verification Subscription
        </h2>
        <p>Maintain your verified artist status with annual subscription</p>
      </div>

      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {!subscription ? (
        // No subscription - show sign up form
        <div className={styles.noSubscription}>
          <div className={styles.benefits}>
            <h3>Verified Artist Benefits</h3>
            <ul>
              <li><i className="fas fa-star"></i> Skip required fields on applications</li>
              <li><i className="fas fa-badge-check"></i> Verified badge on your profile</li>
              <li><i className="fas fa-users"></i> Multiple professional personas</li>
              <li><i className="fas fa-lightning"></i> Priority application processing</li>
            </ul>
          </div>

          <div className={styles.pricing}>
            <div className={styles.priceCard}>
              <h4>Base Verification</h4>
              <div className={styles.price}>$50<span>/year</span></div>
              <p>Verified artist status with enhanced features</p>
            </div>
            <div className={styles.priceCard}>
              <h4>Additional Personas</h4>
              <div className={styles.price}>$10<span>/year each</span></div>
              <p>Professional identities for different art mediums</p>
            </div>
          </div>

          {!showSubscriptionForm ? (
            <button 
              className={styles.primaryButton}
              onClick={() => setShowSubscriptionForm(true)}
            >
              <i className="fas fa-credit-card"></i>
              Subscribe to Verification
            </button>
          ) : (
            <form onSubmit={handleCreateSubscription} className={styles.subscriptionForm}>
              <div className={styles.formGroup}>
                <label htmlFor="personaCount">Additional Personas</label>
                <select
                  id="personaCount"
                  value={personaCount}
                  onChange={(e) => setPersonaCount(parseInt(e.target.value))}
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={i}>
                      {i} personas ({i > 0 ? `+$${i * 10}` : 'included'})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.totalPrice}>
                <strong>Total: ${calculatePrice(personaCount)}/year</strong>
              </div>

              <div className={styles.formActions}>
                <button type="submit" disabled={isProcessing} className={styles.primaryButton}>
                  {isProcessing ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating Subscription...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Create Subscription
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowSubscriptionForm(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        // Has subscription - show management interface
        <div className={styles.existingSubscription}>
          <div className={styles.subscriptionStatus}>
            <div className={styles.statusBadge}>
              <i className={`fas fa-circle ${styles[subscription.status]}`}></i>
              Status: {subscription.status.replace('_', ' ')}
            </div>
            
            {subscription.current_period_end && (
              <div className={styles.renewalDate}>
                Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className={styles.subscriptionDetails}>
            <h4>Current Plan</h4>
            <div className={styles.planItems}>
              <div className={styles.planItem}>
                <i className="fas fa-certificate"></i>
                Base Verification - $50/year
              </div>
              {getCurrentPersonaCount() > 0 && (
                <div className={styles.planItem}>
                  <i className="fas fa-users"></i>
                  {getCurrentPersonaCount()} Additional Personas - ${getCurrentPersonaCount() * 10}/year
                </div>
              )}
            </div>
            
            <div className={styles.totalCost}>
              <strong>Total: ${calculatePrice(getCurrentPersonaCount())}/year</strong>
            </div>
          </div>

          <div className={styles.subscriptionActions}>
            <h4>Manage Subscription</h4>
            
            {/* Connect Balance & Payment Preferences */}
            <div className={styles.actionGroup}>
              <label>Payment Method Preferences</label>
              
              <div className={styles.connectBalanceInfo}>
                <div className={styles.balanceDisplay}>
                  <i className="fas fa-wallet"></i>
                  <span>Vendor Balance: <strong>${connectBalance.available.toFixed(2)}</strong></span>
                  {connectBalance.pending > 0 && (
                    <span className={styles.pendingBalance}>
                      (+${connectBalance.pending.toFixed(2)} pending)
                    </span>
                  )}
                </div>
                
                {connectBalance.connect_account_id && (
                  <div className={styles.paymentPreference}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={preferConnectBalance}
                        onChange={(e) => handlePaymentPreferenceChange(e.target.checked)}
                        disabled={isProcessing}
                      />
                      <span>Use vendor earnings for subscription payments</span>
                    </label>
                    
                    {preferConnectBalance && (
                      <div className={styles.preferenceInfo}>
                        <i className="fas fa-info-circle"></i>
                        <span>
                          {connectBalance.available >= calculatePrice(getCurrentPersonaCount()) 
                            ? `✅ Next renewal will use vendor earnings ($${connectBalance.available.toFixed(2)} available)`
                            : `⚠️ Insufficient balance for next renewal. Will use saved card as backup.`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.actionGroup}>
              <label>Adjust Persona Count:</label>
              <div className={styles.personaControls}>
                {[0, 1, 2, 3, 4, 5].map(count => (
                  <button
                    key={count}
                    onClick={() => handleUpdatePersonas(count)}
                    disabled={isProcessing || count === getCurrentPersonaCount()}
                    className={count === getCurrentPersonaCount() ? styles.active : styles.personaButton}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className={styles.help}>
                Changes will be prorated and billed immediately
              </p>
            </div>

            <div className={styles.dangerZone}>
              <h5>Cancel Subscription</h5>
              <div className={styles.cancelOptions}>
                <button
                  onClick={() => handleCancelSubscription(false)}
                  disabled={isProcessing}
                  className={styles.warningButton}
                >
                  Cancel at Period End
                </button>
                <button
                  onClick={() => handleCancelSubscription(true)}
                  disabled={isProcessing}
                  className={styles.dangerButton}
                >
                  Cancel Immediately
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
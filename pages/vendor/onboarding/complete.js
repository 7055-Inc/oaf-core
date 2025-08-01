import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../../../components/Header';
import { authenticatedApiRequest, getAuthToken } from '../../../lib/csrf';
import styles from '../../../styles/ProfileCompletion.module.css';
export default function StripeOnboardingComplete() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [allowConnectPayments, setAllowConnectPayments] = useState(true); // Default checked
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesStep, setPreferencesStep] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      router.push('/');
      return;
    }

    // Check account status after onboarding
    checkAccountStatus();
  }, []);

  useEffect(() => {
    // For verified accounts, show preferences step first
    if (accountStatus && accountStatus.stripe_account_verified && !preferencesStep) {
      setPreferencesStep(true);
      return;
    }
    
    // For non-verified accounts or after preferences are handled, start countdown
    if (accountStatus && (!accountStatus.stripe_account_verified || !preferencesStep) && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Redirect to dashboard
      router.push('/dashboard?section=account&slideIn=payment-management');
    }
  }, [accountStatus, preferencesStep, countdown, router]);

  const checkAccountStatus = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch account status');
      }
      const data = await response.json();
      setAccountStatus(data.settings);
    } catch (err) {
      setError('Unable to verify account status');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard?section=account&slideIn=payment-management');
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/subscription-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_payment_method: allowConnectPayments ? 'balance_first' : 'card_only',
          reverse_transfer_enabled: allowConnectPayments
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
      
      // Move to countdown phase
      setPreferencesStep(false);
      setCountdown(5);
    } catch (err) {
      setError('Unable to save payment preferences. Your account is still connected successfully.');
      // Still allow them to continue
      setPreferencesStep(false);
      setCountdown(5);
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Setting up your payment account...</title>
        </Head>
        <Header />
        <div className="section-box">
          <div>
            <div>
              <div>Loading...</div>
              <h2>Verifying your account setup...</h2>
              <p>Please wait while we confirm your payment account details.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Payment Setup - Error</title>
        </Head>
        <Header />
        <div className="section-box">
          <div>
            <div className="error-alert">
              <div>⚠️</div>
              <h2>Unable to Verify Setup</h2>
              <p>{error}</p>
              <button 
                onClick={handleGoToDashboard}
                className={styles.primaryButton}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isVerified = accountStatus?.stripe_account_verified;
  const hasAccount = accountStatus?.stripe_account_id;

  return (
    <>
      <Head>
        <title>Payment Setup Complete</title>
      </Head>
      <Header />
      <div className="section-box">
        <div>
          <div>
            {isVerified ? (
              preferencesStep ? (
                <>
                  <div className={styles.successIcon}>💳</div>
                  <h2>Payment Preferences</h2>
                  <p>Your Stripe account is connected! One more quick step - would you like to use your Connect earnings to pay for platform subscriptions?</p>
                  
                  <div className={styles.preferencesContainer}>
                    <label className={styles.checkboxLabel}>
                      <input 
                        type="checkbox"
                        checked={allowConnectPayments}
                        onChange={(e) => setAllowConnectPayments(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <div className={styles.checkboxContent}>
                        <strong>Use Connect balance for subscriptions</strong>
                        <div className={styles.checkboxDescription}>
                          Automatically pay for your platform subscriptions and services using 
                          your available Connect balance before charging your card. You can change 
                          this anytime in your Payment Management settings.
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <button 
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className={styles.primaryButton}
                    style={{ marginTop: '20px' }}
                  >
                    {savingPreferences ? 'Saving...' : 'Save Preferences & Continue'}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.successIcon}>✅</div>
                  <h2>Payment Account Connected!</h2>
                  <p>Your Stripe account has been successfully connected and verified. You can now receive payments from your sales and services.</p>
                  <div className={styles.accountInfo}>
                    <div className={styles.infoItem}>
                      <strong>Account Status:</strong> <span style={{ color: '#198754' }}>Verified ✓</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Payout Schedule:</strong> Every {accountStatus?.payout_days || 15} days
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Commission Rate:</strong> {accountStatus?.commission_rate || 15}%
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Payment Method:</strong> <span style={{ color: '#055474' }}>
                        {allowConnectPayments ? 'Connect Balance First' : 'Card Only'}
                      </span>
                    </div>
                  </div>
                </>
              )
            ) : hasAccount ? (
              <>
                <div className={styles.warningIcon}>⏳</div>
                <h2>Setup In Progress</h2>
                <p>Your Stripe account has been created but may need additional information. You can continue the setup process anytime from your dashboard.</p>
                <div className={styles.accountInfo}>
                  <div className={styles.infoItem}>
                    <strong>Account Status:</strong> <span style={{ color: '#fd7e14' }}>Pending Verification</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.infoIcon}>ℹ️</div>
                <h2>Setup Started</h2>
                <p>Thank you for starting the payment setup process. You can complete or continue your setup anytime from your dashboard.</p>
              </>
            )}
            
            {!preferencesStep && (
              <div className={styles.redirectInfo}>
                <p>Redirecting to your dashboard in <strong>{countdown}</strong> seconds...</p>
                <button 
                  onClick={handleGoToDashboard}
                  className={styles.primaryButton}
                >
                  Go to Dashboard Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


    </>
  );
}
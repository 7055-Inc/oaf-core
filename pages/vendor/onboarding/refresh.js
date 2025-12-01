import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest, getAuthToken } from '../../../lib/csrf';
import { authApiRequest } from '../../../lib/apiUtils';
import styles from '../../../styles/ProfileCompletion.module.css';

export default function StripeOnboardingRefresh() {
  const [status, setStatus] = useState('loading'); // loading, error, redirecting
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken();
    if (!token) {
      router.push('/');
      return;
    }

    // Immediately try to refresh the onboarding link
    refreshOnboardingLink();
  }, []);

  const refreshOnboardingLink = async () => {
    try {
      setStatus('loading');
      setError(null);

      const response = await authApiRequest('vendor/stripe-onboarding');
      
      if (!response.ok) {
        throw new Error('Failed to refresh onboarding link');
      }
      
      const data = await response.json();
      
      if (data.success && data.onboarding_url) {
        setStatus('redirecting');
        // Small delay to show the redirecting message
        setTimeout(() => {
          window.location.href = data.onboarding_url;
        }, 1000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Unable to refresh onboarding link');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(retryCount + 1);
      refreshOnboardingLink();
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard?section=account&slideIn=payment-management');
  };

  if (status === 'loading') {
    return (
      <>
        <Head>
          <title>Refreshing payment setup...</title>
        </Head>
        <div className="section-box">
          <div>
            <div>
              <div>Loading...</div>
              <h2>Refreshing your setup...</h2>
              <p>Please wait while we generate a fresh onboarding link for you.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (status === 'redirecting') {
    return (
      <>
        <Head>
          <title>Redirecting to Stripe...</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.loadingContainer}>
              <div className={styles.successIcon}>🔄</div>
              <h2>Redirecting...</h2>
              <p>Taking you back to complete your payment setup.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Head>
          <title>Payment Setup - Error</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h2>Unable to Refresh Setup</h2>
              <p>{error}</p>
              
              <div className={styles.actionButtons}>
                {retryCount < 3 ? (
                  <button 
                    onClick={handleRetry}
                    className={styles.secondaryButton}
                    style={{ marginRight: '12px' }}
                  >
                    Try Again ({3 - retryCount} attempts left)
                  </button>
                ) : (
                  <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '16px' }}>
                    Maximum retry attempts reached. Please try again later or contact support.
                  </div>
                )}
                
                <button 
                  onClick={handleGoToDashboard}
                  className={styles.primaryButton}
                >
                  Return to Dashboard
                </button>
              </div>

              <div className={styles.helpText}>
                <h4>What happened?</h4>
                <p>The onboarding link may have expired or there might be a temporary issue. This is normal and can happen if:</p>
                <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                  <li>You refreshed the page during setup</li>
                  <li>You used the back/forward browser buttons</li>
                  <li>The setup link expired (they last only a few minutes)</li>
                  <li>There's a temporary connection issue</li>
                </ul>
                <p>You can always restart the payment setup process from your dashboard.</p>
              </div>
            </div>
          </div>
        </div>


      </>
    );
  }

  return null;
}
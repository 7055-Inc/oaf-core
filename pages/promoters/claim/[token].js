import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../../../lib/config';
import styles from './claim.module.css';

export default function ClaimPromoter() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Verify token and load event data
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`api/promoters/verify-claim/${token}`));
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid or expired claim link');
          setLoading(false);
          return;
        }

        setEventData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error verifying token:', err);
        setError('Failed to verify claim link');
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Validate password
  const validatePassword = () => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Handle claim submission
  const handleClaim = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Step 1: Create Firebase account
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const auth = getAuth();
      
      let firebaseUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          eventData.promoter_email, 
          password
        );
        firebaseUser = userCredential.user;
      } catch (firebaseError) {
        console.error('Firebase signup error:', firebaseError);
        throw new Error(`Failed to create account: ${firebaseError.message}`);
      }

      // Step 2: Get Firebase ID token
      const firebaseToken = await firebaseUser.getIdToken();

      // Step 3: Activate account in backend
      const response = await fetch(getApiUrl(`api/promoters/claim/${token}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firebase_uid: firebaseUser.uid })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim account');
      }

      // Step 4: Exchange Firebase token for backend JWT
      const authResponse = await fetch(getApiUrl('auth/exchange'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          provider: 'google',
          token: firebaseToken,
          email: eventData.promoter_email
        }),
        credentials: 'include' // Important: this stores the JWT cookie
      });

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate. Please try logging in manually.');
      }

      const authData = await authResponse.json();
      
      // Step 5: Store JWT tokens in localStorage (matching the app's auth pattern)
      if (authData.token) {
        localStorage.setItem('token', authData.token);
      }
      if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
      }

      // Step 6: Force full page redirect to ensure localStorage is loaded
      // Using window.location instead of router.push to avoid race condition
      window.location.href = data.redirect_url || `/events/${data.event_id}/edit`;
      
    } catch (err) {
      console.error('Error claiming account:', err);
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Claim Account - Brakebee</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Verifying claim link...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Claim Account - Brakebee</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1>Invalid Claim Link</h1>
            <p>{error}</p>
            <p className={styles.errorHelp}>
              This link may have expired or already been used. Please contact support if you need assistance.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Claim Your Account - {eventData?.event_title} - Brakebee</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Welcome to Brakebee!</h1>
            <p className={styles.subtitle}>
              Set your password to activate your account and claim your event
            </p>
          </div>

          <div className={styles.eventDetails}>
            <h3>Your Event</h3>
            <div className={styles.detailRow}>
              <span className={styles.label}>Event Name:</span>
              <span className={styles.value}>{eventData?.event_title}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Dates:</span>
              <span className={styles.value}>
                {new Date(eventData?.event_start_date).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })} - {new Date(eventData?.event_end_date).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })}
              </span>
            </div>
            {eventData?.venue_name && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Venue:</span>
                <span className={styles.value}>{eventData.venue_name}</span>
              </div>
            )}
            {(eventData?.venue_city || eventData?.venue_state) && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Location:</span>
                <span className={styles.value}>
                  {[eventData.venue_city, eventData.venue_state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleClaim} className={styles.claimForm}>
            <div className={styles.accountInfo}>
              <h3>Account Information</h3>
              <div className={styles.formGroup}>
                <label>Email Address:</label>
                <input
                  type="email"
                  value={eventData?.promoter_email || ''}
                  disabled
                  className={styles.inputDisabled}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Name:</label>
                <input
                  type="text"
                  value={eventData?.promoter_name || ''}
                  disabled
                  className={styles.inputDisabled}
                />
              </div>
            </div>

            <div className={styles.passwordSection}>
              <h3>Set Your Password</h3>
              <div className={styles.formGroup}>
                <label htmlFor="password">
                  Password <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="8"
                  className={styles.input}
                  placeholder="At least 8 characters"
                  disabled={processing}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">
                  Confirm Password <span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="8"
                  className={styles.input}
                  placeholder="Re-enter your password"
                  disabled={processing}
                />
              </div>
              {passwordError && (
                <div className={styles.passwordError}>
                  {passwordError}
                </div>
              )}
            </div>

            <div className={styles.benefits}>
              <h3>What's Next?</h3>
              <ul>
                <li>✅ Your account will be activated</li>
                <li>✅ You'll be logged in automatically</li>
                <li>✅ You'll be redirected to complete your event setup</li>
                <li>✅ You can start accepting artist applications</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={processing}
              className={styles.claimButton}
            >
              {processing ? 'Activating Account...' : 'Activate Account & Claim Event'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}


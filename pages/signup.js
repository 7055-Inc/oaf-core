'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import firebaseApp from '../lib/firebase';
import { getApiUrl } from '../lib/config';
import { clearAuthTokens } from '../lib/csrf';
import CookieConsentModal from '../components/CookieConsentModal';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [canShowSignupForm, setCanShowSignupForm] = useState(false);
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  // Check cookie consent on page load
  useEffect(() => {
    const hasConsented = localStorage.getItem('cookieConsent');
    if (hasConsented === 'true') {
      setCanShowSignupForm(true);
    } else {
      setShowConsentModal(true);
    }
  }, []);

  // Handle countdown and redirect to login
  useEffect(() => {
    let timer;
    if (message && countdown === null) {
      // Start countdown at 10 seconds
      setCountdown(10);
    }
    
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      // Redirect to login when countdown reaches 0
      router.push('/login');
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [message, countdown, router]);

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await authenticateWithBackend('google', idToken, result.user.email);
    } catch (err) {
      console.error('Google signup error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Configure action code settings to redirect to our verification handler
      const actionCodeSettings = {
        url: `${window.location.origin}/custom-sites/signup`,
        handleCodeInApp: true
      };
      
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      setMessage('Signup successful! Please check your email to verify your account before logging in.');
      setEmail('');
      setPassword('');
      setIsLoading(false);
    } catch (err) {
      console.error('Email signup error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const authenticateWithBackend = async (provider, token, email) => {
    try {
      // Clear any existing tokens first
      clearAuthTokens();
      
      const response = await fetch(getApiUrl('auth/exchange'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, token, email }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const data = await response.json();
      
      if (data.token && data.refreshToken) {
        // Set both tokens in localStorage and cookies
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // Set secure cookies for middleware
        document.cookie = `token=${data.token}; path=/; domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.brakebee.com'}; secure; samesite=lax; max-age=7200`;
        document.cookie = `refreshToken=${data.refreshToken}; path=/; domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.brakebee.com'}; secure; samesite=lax; max-age=604800`;
        
        // Authentication successful, tokens set
        
        // Wait a moment for the cookies to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check for redirect parameter, otherwise go to dashboard (middleware will handle user type selection)
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect') || '/dashboard';
        window.location.href = redirectUrl;
      } else {
        throw new Error('Invalid response: missing tokens');
      }
    } catch (err) {
      console.error('Backend authentication error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | Brakebee</title>
        <meta name="description" content="Create your free Brakebee account. Join our community of artists and art lovers to discover, create, and share unique artwork." />
      </Head>
      
      {/* Cookie Consent Modal - blocks everything until consent */}
      {showConsentModal && (
        <CookieConsentModal 
          onAccept={() => {
            setShowConsentModal(false);
            setCanShowSignupForm(true);
          }}
          onDecline={() => {
            // Keep modal open, don't allow signup
          }}
        />
      )}
      
      {canShowSignupForm ? (
        <div className="section-box" style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <h1 style={{ textAlign: 'center' }}>Sign Up</h1>
          
          {error && (
            <div className="error-alert" style={{ textAlign: 'center' }}>
              Error: {error}
            </div>
          )}
          
          {message && (
            <div className="success-alert" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                ✅ Signup Successful!
              </div>
              <div style={{ marginBottom: '1rem' }}>
                Please check your email to verify your account before logging in.
              </div>
              {countdown !== null && (
                <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Redirecting to login page in {countdown} second{countdown !== 1 ? 's' : ''}...
                </div>
              )}
            </div>
          )}
          
          {/* Google Sign-Up Button */}
          <button 
            onClick={handleGoogleSignup} 
            disabled={isLoading}
            className="secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '2rem'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing up...' : 'Sign up with Google'}
          </button>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '2rem'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#dee2e6' }}></div>
            <span style={{ padding: '0 1rem', fontSize: '14px', color: '#6c757d' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#dee2e6' }}></div>
          </div>

          {/* Email Signup Form */}
          <form onSubmit={handleEmailSignup} className="form-grid-1">
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {isLoading ? 'Signing up...' : 'Sign up with Email'}
            </button>
          </form>
          
          <p style={{ marginTop: '2rem', textAlign: 'center' }}>
            Already have an account? <a href="/login">Log in here</a>
          </p>
        </div>
      ) : !showConsentModal ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>Cookie Consent Required</h2>
          <p>Please accept cookies to access the signup form.</p>
        </div>
      ) : null}
    </>
  );
}

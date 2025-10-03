'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import firebaseApp from '../lib/firebase';
import { getApiUrl } from '../lib/config';
import Header from '../components/Header';
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
      await sendEmailVerification(userCredential.user);
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
        document.cookie = `token=${data.token}; path=/; domain=.beemeeart.com; secure; samesite=lax; max-age=3600`;
        document.cookie = `refreshToken=${data.refreshToken}; path=/; domain=.beemeeart.com; secure; samesite=lax; max-age=604800`;
        
        // Authentication successful, tokens set
        
        // Wait a moment for the cookies to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard (middleware will handle user type selection)
        window.location.href = '/dashboard';
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
    <div>
      <Header />
      
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
        <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ color: '#055474', marginBottom: '2rem', textAlign: 'center' }}>Sign Up</h1>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '0px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Error: {error}
          </div>
        )}
        
        {message && (
          <div style={{
            backgroundColor: '#3e1c56',
            color: 'white',
            padding: '1.5rem',
            marginBottom: '2rem',
            borderRadius: '0px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(62, 28, 86, 0.3)',
            border: '2px solid #3e1c56'
          }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              ✅ Signup Successful!
            </div>
            <div style={{
              fontSize: '1rem',
              lineHeight: '1.5',
              marginBottom: '1rem'
            }}>
              Please check your email to verify your account before logging in.
            </div>
            {countdown !== null && (
              <div style={{
                fontSize: '0.9rem',
                opacity: '0.9',
                fontStyle: 'italic'
              }}>
                Redirecting to login page in {countdown} second{countdown !== 1 ? 's' : ''}...
              </div>
            )}
          </div>
        )}
        
        {/* Google Sign-Up Button */}
        <button 
          onClick={handleGoogleSignup} 
          disabled={isLoading}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: '#ffffff',
            color: '#757575',
            border: '1px solid #dadce0',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '2rem',
            transition: 'background-color 0.2s, box-shadow 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
          onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#f8f9fa')}
          onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#ffffff')}
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
          marginBottom: '2rem',
          color: '#666'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e9ecef' }}></div>
          <span style={{ padding: '0 1rem', fontSize: '14px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e9ecef' }}></div>
        </div>

        {/* Email Signup Form */}
        <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e9ecef',
                borderRadius: '0px',
                fontSize: '1rem',
                backgroundColor: isLoading ? '#f8f9fa' : 'white'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e9ecef',
                borderRadius: '0px',
                fontSize: '1rem',
                backgroundColor: isLoading ? '#f8f9fa' : 'white'
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              backgroundColor: '#055474',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1rem',
              borderRadius: '0px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginTop: '1rem'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#3e1c56')}
            onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#055474')}
          >
            {isLoading ? 'Signing up...' : 'Sign up with Email'}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', textAlign: 'center', color: '#666' }}>
          Already have an account? <a href="/login" style={{ color: '#055474', textDecoration: 'none', fontWeight: '500' }}>Log in here</a>
        </p>
        </div>
      ) : !showConsentModal ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>Cookie Consent Required</h2>
          <p>Please accept cookies to access the signup form.</p>
        </div>
      ) : null}
    </div>
  );
}
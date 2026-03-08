'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import firebaseApp from '../../../lib/firebase';
import { clearAuthTokens, storeTokens } from '../../../lib/auth';
import { getApiUrl } from '../../../lib/config';


export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendMessage, setResendMessage] = useState(null);
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await authenticateWithBackend('google', idToken, result.user.email);
    } catch (err) {
      console.error('Google login error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResendMessage(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        throw new Error('Please verify your email before logging in.');
      }
      const idToken = await user.getIdToken();
      await authenticateWithBackend('email', idToken, email);
    } catch (err) {
      console.error('Email login error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    
    setIsLoading(true);
    setResendMessage(null);
    setError(null);
    
    try {
      // Configure action code settings to redirect to our verification handler
      const actionCodeSettings = {
        url: `${window.location.origin}/custom-sites/signup`,
        handleCodeInApp: true
      };
      
      await sendEmailVerification(unverifiedUser, actionCodeSettings);
      setResendMessage('Verification email sent! Please check your inbox and spam folder.');
      setUnverifiedUser(null);
    } catch (err) {
      console.error('Error resending verification:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBackend = async (provider, token, email) => {
    try {
      // Clear any existing tokens first
      clearAuthTokens();
      
      // Use v2 login endpoint
      const response = await fetch(getApiUrl('api/v2/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken: token, provider }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Authentication failed');
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.accessToken && result.data?.refreshToken) {
        // Store tokens using auth module
        storeTokens(result.data.accessToken, result.data.refreshToken);
        
        // Wait a moment for the cookies to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check for redirect parameter, otherwise go to dashboard
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
    <div className="section-box" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Login</h1>
      
      {/* Error Message */}
      {error && (
        <div className="error-alert" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: unverifiedUser ? '0.75rem' : '0' }}>
            {error}
          </div>
          {unverifiedUser && (
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              style={{ 
                backgroundColor: '#dc2626',
                fontSize: '0.875rem',
                padding: '0.5rem 1rem'
              }}
            >
              {isLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          )}
        </div>
      )}

      {/* Success Message for Resend */}
      {resendMessage && (
        <div className="success-alert" style={{ textAlign: 'center' }}>
          {resendMessage}
        </div>
      )}
      
      {/* Google Sign-In Button */}
      <button 
        onClick={handleGoogleLogin} 
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
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
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

      {/* Email Login Form */}
      <form onSubmit={handleEmailLogin} className="form-grid-1">
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
        
        {/* Forgot Password Link */}
        <div style={{ textAlign: 'right' }}>
          <a href="/forgot-password" style={{ fontSize: '14px', textDecoration: 'underline' }}>
            Forgot Password?
          </a>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Email'}
        </button>
      </form>
      
      <p style={{ marginTop: '2rem', textAlign: 'center' }}>
        Don't have an account? <a href="/signup">Sign up here</a>
      </p>
    </div>
  );
}

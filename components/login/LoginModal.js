'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseApp from '../../lib/firebase';
import { clearAuthTokens } from '../../lib/csrf';


export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
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

  const authenticateWithBackend = async (provider, token, email) => {
    try {
      // Clear any existing tokens first
      clearAuthTokens();
      
      const response = await fetch('https://api2.onlineartfestival.com/auth/exchange', {
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
        document.cookie = `token=${data.token}; path=/; domain=.onlineartfestival.com; secure; samesite=lax; max-age=3600`;
        document.cookie = `refreshToken=${data.refreshToken}; path=/; domain=.onlineartfestival.com; secure; samesite=lax; max-age=604800`;
        
        console.log('Authentication successful, tokens set');
        
        // Wait a moment for the cookies to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard
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
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ color: '#055474', marginBottom: '2rem', textAlign: 'center' }}>Login</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>Error: {error}</p>}
      
      {/* Google Sign-In Button */}
      <button 
        onClick={handleGoogleLogin} 
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
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
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

      {/* Email Login Form */}
      <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        
        {/* Forgot Password Link */}
        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
          <a
            href="/forgot-password"
            style={{
              color: '#055474',
              fontSize: '14px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Forgot Password?
          </a>
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
          {isLoading ? 'Signing in...' : 'Sign in with Email'}
        </button>
      </form>
      
      <p style={{ marginTop: '2rem', textAlign: 'center', color: '#666' }}>
        Don't have an account? <a href="/signup" style={{ color: '#055474', textDecoration: 'none', fontWeight: '500' }}>Sign up here</a>
      </p>
    </div>
  );
}
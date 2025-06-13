'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseApp from '../lib/firebase';

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
      const res = await fetch('https://api2.onlineartfestival.com/auth/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, token, email })
      });
      if (!res.ok) {
        throw new Error('Failed to authenticate with backend');
      }
      const data = await res.json();
      if (data.token) {
        // Set token in both localStorage and cookies
        localStorage.setItem('token', data.token);
        document.cookie = `token=${data.token}; path=/`;
        
        // Wait a moment for the cookie to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload the page to trigger the middleware
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Backend authentication error:', err.message);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <button 
        onClick={handleGoogleLogin} 
        style={{ marginBottom: '1rem' }}
        disabled={isLoading}
      >
        {isLoading ? 'Logging in...' : 'Login with Google'}
      </button>
      <form onSubmit={handleEmailLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginLeft: '0.5rem' }}
            disabled={isLoading}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginLeft: '0.5rem' }}
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login with Email'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Don't have an account? <a href="/signup">Sign up here</a>
      </p>
    </div>
  );
}
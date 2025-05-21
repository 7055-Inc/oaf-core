'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../lib/firebase'; // Updated import path

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();
  const auth = getAuth(app);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await authenticateWithBackend('google', idToken, result.user.email);
    } catch (err) {
      console.error('Google login error:', err.message);
      setError(err.message);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
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
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Backend authentication error:', err.message);
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <button onClick={handleGoogleLogin} style={{ marginBottom: '1rem' }}>
        Login with Google
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
          />
        </div>
        <button type="submit">Login with Email</button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Don’t have an account? <a href="/signup">Sign up here</a>
      </p>
    </div>
  );
}
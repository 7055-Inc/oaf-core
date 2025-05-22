'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import firebaseApp from '../lib/firebase'; // Updated import path
import Header from '../components/Header';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setMessage('Signup successful! Please check your email to verify your account.');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Signup error:', err.message);
      setError(err.message);
    }
  };

  return (
    <div>
      <Header />
      <div style={{ padding: '2rem' }}>
        <h1>Sign Up</h1>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <form onSubmit={handleSignup}>
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
          <button type="submit">Sign Up</button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          Already have an account? <a href="/">Log in here</a>
        </p>
      </div>
    </div>
  );
}
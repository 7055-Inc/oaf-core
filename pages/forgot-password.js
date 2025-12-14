'use client';
import { useState } from 'react';
import Head from 'next/head';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import firebaseApp from '../lib/firebase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const auth = getAuth(firebaseApp);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setIsSuccess(true);
      setMessage('Password reset email sent! Please check your inbox and spam folder.');
    } catch (err) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase errors
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many password reset attempts. Please try again later.');
          break;
        default:
          setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <Head>
        <title>Reset Password | Brakebee</title>
        <meta name="description" content="Reset your Brakebee account password. Enter your email to receive a password reset link." />
      </Head>
      
      <div className="section-box" style={{ maxWidth: '500px', margin: '2rem auto' }}>
        <h1 style={{ textAlign: 'center' }}>Reset Your Password</h1>
        
        <p style={{ textAlign: 'center', marginBottom: '2rem', lineHeight: '1.5' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div className="error-alert" style={{ textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div className="success-alert" style={{ textAlign: 'center' }}>
            {message}
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handlePasswordReset} className="form-grid-1">
            <div>
              <label>Email Address:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your email address"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', color: 'var(--success-color)', marginBottom: '1rem' }}>
              ✓
            </div>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>
              If an account with that email exists, you should receive a password reset email within a few minutes.
            </p>
          </div>
        )}

        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #dee2e6'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            Remember your password?
          </p>
          <a href="/login">Back to Login</a>
        </div>
      </div>
    </>
  );
}

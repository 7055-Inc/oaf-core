'use client';
import { useState } from 'react';
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
    <div style={{ 
        padding: '2rem', 
        maxWidth: '500px', 
        margin: '2rem auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          color: '#055474', 
          marginBottom: '1rem', 
          textAlign: 'center',
          fontSize: '2rem'
        }}>
          Reset Your Password
        </h1>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '2rem', 
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handlePasswordReset}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: '#333', 
                fontWeight: '500',
                fontSize: '1rem'
              }}>
                Email Address:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your email address"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: isLoading ? '#f8f9fa' : 'white',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                width: '100%',
                backgroundColor: '#055474',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                marginBottom: '1rem'
              }}
              onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#3e1c56')}
              onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#055474')}
            >
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              color: '#10b981',
              marginBottom: '1rem'
            }}>
              ✓
            </div>
            <p style={{ 
              color: '#666', 
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              If an account with that email exists, you should receive a password reset email within a few minutes.
            </p>
          </div>
        )}

        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e9ecef'
        }}>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            Remember your password?
          </p>
          <a 
            href="/login" 
            style={{ 
              color: '#055474', 
              textDecoration: 'none', 
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            Back to Login
          </a>
        </div>
      </div>
  );
}

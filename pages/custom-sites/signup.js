'use client';
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, getIdToken, applyActionCode, isSignInWithEmailLink, signInWithEmailLink, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import firebaseApp from '../../lib/firebase';
import { clearAuthTokens } from '../../lib/csrf';
import styles from './signup.module.css';

const SignupCallbackPage = () => {
  const router = useRouter();
  const { subdomain, mode, oobCode, apiKey, continueUrl } = router.query;
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Processing...');
  const [error, setError] = useState(null);
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    if (router.isReady) {
      handleAuthFlow();
    }
  }, [router.isReady, mode, oobCode, apiKey]);

  const handleAuthFlow = async () => {
    try {
      setStatus('processing');
      
      // Check if this is an email verification link
      if (mode === 'verifyEmail' && oobCode) {
        await handleEmailVerification();
      }
      // Check if this is a password reset link
      else if (mode === 'resetPassword' && oobCode) {
        await handlePasswordReset();
      }
      // Check if this is an email sign-in link
      else if (isSignInWithEmailLink(auth, window.location.href)) {
        await handleEmailSignInLink();
      }
      // Otherwise, handle as OAuth callback
      else {
        await handleOAuthCallback();
      }
    } catch (err) {
      console.error('Auth flow error:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  const handleEmailVerification = async () => {
    try {
      setMessage('Verifying your email address...');
      
      // Apply the email verification code
      await applyActionCode(auth, oobCode);
      
      setStatus('success');
      setMessage('Email verified successfully! You can now log in.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = 'https://main.onlineartfestival.com/login';
      }, 3000);
      
    } catch (err) {
      console.error('Email verification error:', err);
      setStatus('error');
      
      // More specific error messages
      if (err.code === 'auth/invalid-action-code') {
        setError('This verification link is invalid or has already been used.');
      } else if (err.code === 'auth/expired-action-code') {
        setError('This verification link has expired. Please request a new one.');
      } else {
        setError(err.message || 'Failed to verify email');
      }
    }
  };

  const handlePasswordReset = async () => {
    try {
      setMessage('Verifying password reset code...');
      
      // Verify the password reset code is valid
      await verifyPasswordResetCode(auth, oobCode);
      
      // Prompt for new password
      const newPassword = window.prompt('Please enter your new password (minimum 6 characters):');
      
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Confirm the password reset
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      setStatus('success');
      setMessage('Password reset successfully! You can now log in with your new password.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = 'https://main.onlineartfestival.com/login';
      }, 3000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      
      if (err.code === 'auth/invalid-action-code') {
        setError('This password reset link is invalid or has already been used.');
      } else if (err.code === 'auth/expired-action-code') {
        setError('This password reset link has expired. Please request a new one.');
      } else {
        setError(err.message || 'Failed to reset password');
      }
    }
  };

  const handleEmailSignInLink = async () => {
    try {
      setMessage('Completing sign-in...');
      
      // Get email from localStorage (should have been stored during sign-up)
      let email = localStorage.getItem('emailForSignIn');
      if (!email) {
        // Prompt user for email if not found
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (!email) {
        throw new Error('Email is required to complete sign-in');
      }
      
      // Complete the sign-in
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const idToken = await getIdToken(result.user);
      
      // Clean up
      localStorage.removeItem('emailForSignIn');
      
      setMessage('Exchanging tokens...');
      await authenticateWithBackend('email', idToken, result.user.email);
      
    } catch (err) {
      console.error('Email sign-in link error:', err);
      setStatus('error');
      setError(err.message);
    }
  };

  const handleOAuthCallback = async () => {
    try {
      setMessage('Completing authentication...');

      // Wait for Firebase auth state to be determined
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            // User is signed in, get the ID token
            const idToken = await getIdToken(user);
            
            // Determine provider (Google or email)
            const provider = user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
            
            setMessage('Exchanging tokens...');
            await authenticateWithBackend(provider, idToken, user.email);
            
          } catch (err) {
            console.error('Error completing authentication:', err);
            setStatus('error');
            setError(err.message);
          }
        } else {
          // No user signed in, might be an error or still processing
          setTimeout(() => {
            if (status === 'processing') {
              setStatus('error');
              setError('Authentication failed. No user found.');
            }
          }, 5000); // Wait 5 seconds before showing error
        }
        
        unsubscribe(); // Clean up listener
      });

    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setError(err.message);
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
        
        setStatus('success');
        setMessage('Authentication successful! Redirecting to main site...');
        
        // Wait a moment for the cookies to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to main site dashboard
        window.location.href = 'https://main.onlineartfestival.com/dashboard';
      } else {
        throw new Error('Invalid response: missing tokens');
      }
    } catch (err) {
      console.error('Backend authentication error:', err.message);
      setStatus('error');
      setError(err.message);
    }
  };

  const handleRetry = () => {
    window.location.href = 'https://main.onlineartfestival.com/login';
  };

  return (
    <>
      <Head>
        <title>
          {mode === 'verifyEmail' ? 'Verifying Email' : 'Completing Authentication'} - Online Art Festival
        </title>
        <meta name="description" content="Completing your authentication with Online Art Festival." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <h1 className={styles.title}>Online Art Festival</h1>
          </div>
          
          <div className={styles.message}>
            {status === 'processing' && (
              <>
                <h2 className={styles.heading}>
                  {mode === 'verifyEmail' ? 'Verifying Email...' : 'Almost there...'}
                </h2>
                <p className={styles.text}>{message}</p>
                <div className={styles.spinner}></div>
              </>
            )}
            
            {status === 'success' && (
              <>
                <h2 className={styles.headingSuccess}>
                  {mode === 'verifyEmail' ? 'Email Verified!' : 'Welcome!'}
                </h2>
                <p className={styles.text}>{message}</p>
                <div className={styles.spinner}></div>
              </>
            )}
            
            {status === 'error' && (
              <>
                <h2 className={styles.headingError}>
                  {mode === 'verifyEmail' ? 'Verification Error' : 'Authentication Error'}
                </h2>
                <p className={styles.textError}>
                  {error || 'Something went wrong.'}
                </p>
                <button 
                  onClick={handleRetry}
                  className={styles.button}
                >
                  {mode === 'verifyEmail' ? 'Go to Login' : 'Try Again'}
                </button>
              </>
            )}
          </div>
          
          {status !== 'error' && (
            <div className={styles.actions}>
              <a 
                href="https://main.onlineartfestival.com" 
                className={styles.linkButton}
              >
                Continue to Main Site
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SignupCallbackPage; 
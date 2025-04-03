// client/src/user-management/registration-parts/Step1.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Step.css';

function Step1({ onSubmit, isLoading, registrationData }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // If user is already authenticated (Google sign-in), prefill email
  useEffect(() => {
    if (currentUser?.email) {
      setEmail(currentUser.email);
      const isGoogleUser = currentUser.providerData[0]?.providerId === 'google.com';
      setIsGoogleUser(isGoogleUser);
      
      if (isGoogleUser) {
        // Check for existing draft before auto-submitting
        checkExistingDraft(currentUser.email);
      }
    }
  }, [currentUser, onSubmit]);

  const checkExistingDraft = async (userEmail) => {
    try {
      const response = await fetch(`/users/register/drafts-by-email/${userEmail}`);
      const data = await response.json();

      if (data.success && data.drafts && data.drafts.length > 0) {
        // If draft exists, we can auto-submit for Google users
        onSubmit({
          email: userEmail,
          draftToken: data.drafts[0].token,
          isGoogleUser: true
        });
      } else {
        // No draft exists, proceed with new registration
        onSubmit({
          email: userEmail,
          isGoogleUser: true
        });
      }
    } catch (err) {
      console.error('Error checking draft:', err);
      // If there's an error checking the draft, proceed with new registration
      onSubmit({
        email: userEmail,
        isGoogleUser: true
      });
    }
  };

  const validateForm = () => {
    // Google users still need a valid email
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Google users don't need password validation
    if (isGoogleUser) {
      return true;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting || isLoading) {
      console.log('Already submitting, ignoring duplicate submission');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // For Google users, we don't need to check for draft
      if (isGoogleUser) {
        onSubmit({
          email,
          isGoogleUser
        });
        return;
      }

      // For regular users, check if there's an existing draft for this email
      const response = await fetch(`/users/register/drafts-by-email/${email}`);
      const data = await response.json();

      if (data.success && data.drafts && data.drafts.length > 0) {
        // Existing draft found, proceed with that draft
        onSubmit({
          email,
          password,
          draftToken: data.drafts[0].token,
          isGoogleUser
        });
      } else {
        // No draft found, parent component will create one
        onSubmit({
          email,
          password,
          isGoogleUser
        });
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-step">
      <p className="step-description">
        {isGoogleUser 
          ? 'Your Google account is connected. Continue to set up your profile.' 
          : 'Enter your email address and create a secure password. Your password should include a mix of letters, numbers, and symbols.'}
      </p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="your@email.com"
            disabled={isLoading || isSubmitting || !!currentUser?.email}
          />
        </div>
        
        {!isGoogleUser && (
          <>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Create a secure password"
                disabled={isLoading || isSubmitting}
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter your password"
                disabled={isLoading || isSubmitting}
              />
            </div>
          </>
        )}
        
        {/* Hidden submit button to allow form submission via the footer button */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </div>
  );
}

export default Step1;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Step.css';

const Step6 = ({ registrationData, onSubmit, isLoading, setIsFormValid }) => {
  const { currentUser } = useAuth();
  console.log('Step6 - Full registration data:', JSON.stringify(registrationData, null, 2));
  console.log('Step6 - Account object:', JSON.stringify(registrationData?.account, null, 2));
  console.log('Step6 - Account keys:', Object.keys(registrationData?.account || {}));
  console.log('Step6 - Account values:', Object.values(registrationData?.account || {}));
  console.log('Step6 - Current user:', currentUser);
  
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    // Set form validity based on verification status
    setIsFormValid(verificationStatus === 'verified');
  }, [verificationStatus, setIsFormValid]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Effect to poll for verification status when email is sent
  useEffect(() => {
    let pollInterval;
    
    if (verificationStatus === 'sent' && currentUser?.uid) {
      // Poll every 5 seconds
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/check-verification/${currentUser.uid}`);
          const data = await response.json();
          
          if (data.success && data.verified) {
            setVerificationStatus('verified');
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Error checking verification status:', err);
          clearInterval(pollInterval);
        }
      }, 5000);
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [verificationStatus, currentUser?.uid]);
  
  const sendVerificationEmail = async () => {
    try {
      setError('');
      setResendDisabled(true);
      setCountdown(60); // 60 second cooldown

      if (!registrationData?.account?.email) {
        throw new Error('Email address not found in registration data');
      }

      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/mail/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registrationData.account.email,
          verificationUrl: `${window.location.origin}/api/verify/${currentUser.uid}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.error || 'Failed to send verification email');
      }

      setVerificationStatus('sent');
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
      console.error('Error sending verification email:', err);
      setResendDisabled(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only proceed if email is verified
    if (verificationStatus === 'verified') {
      onSubmit({
        emailVerified: true
      });
    }
  };
  
  return (
    <div className="registration-step">
      <h2>Verify Your Email</h2>
      <p className="step-description">
        Please verify your email address to complete your registration. This will help us ensure we can reach you for important updates.
      </p>
      
      <div className="verification-container">
        {verificationStatus === 'pending' && (
          <>
            <p>We'll send a verification link to:</p>
            <p className="email-address">{registrationData?.account?.email}</p>
            <button
              type="button"
              className="send-verification-btn"
              onClick={sendVerificationEmail}
              disabled={isLoading}
            >
              Send Verification Email
            </button>
          </>
        )}
        
        {verificationStatus === 'sent' && (
          <>
            <div className="verification-message">
              <p>✓ Verification email sent!</p>
              <p>Please check your inbox and click the verification link.</p>
              <p>We'll automatically detect when you verify your email.</p>
            </div>
            <button
              type="button"
              className="resend-verification-btn"
              onClick={sendVerificationEmail}
              disabled={resendDisabled || isLoading}
            >
              {resendDisabled ? `Resend in ${countdown}s` : 'Resend Verification Email'}
            </button>
          </>
        )}
        
        {verificationStatus === 'verified' && (
          <div className="verification-success">
            <p>✓ Email verified successfully!</p>
            <p>You can now continue with your registration.</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
      
      <form onSubmit={handleSubmit}>
        <button 
          type="submit" 
          className="complete-button"
          disabled={verificationStatus !== 'verified' || isLoading}
        >
          Continue to Next Step
        </button>
      </form>
    </div>
  );
};

export default Step6; 
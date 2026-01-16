'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './ExitIntentPopup.module.css';

/**
 * ExitIntentPopup - Global email collection popup
 * 
 * Shows when user moves mouse toward browser close/back
 * Only shows to new visitors (no existing cookies, not logged in)
 * Sets cookie to prevent showing again
 */
export default function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [hasTriggered, setHasTriggered] = useState(false);

  // Check if user should see the popup
  const shouldShowPopup = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Don't show if already triggered this session
    if (hasTriggered) return false;

    // Don't show if popup cookie exists (already seen/dismissed)
    if (document.cookie.includes('bb_exit_popup_shown')) return false;

    // Don't show if user has auth token (logged in)
    if (document.cookie.includes('auth_token') || 
        document.cookie.includes('session_id') ||
        localStorage.getItem('auth_token')) return false;

    // Don't show if user has interacted with site before (has any of our cookies)
    // This catches returning visitors who cleared the popup cookie but have other cookies
    if (document.cookie.includes('cookie_consent')) return false;

    return true;
  }, [hasTriggered]);

  // Set cookie to prevent showing popup again
  const setPopupCookie = useCallback(() => {
    // Set cookie for 1 year
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `bb_exit_popup_shown=1; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }, []);

  // Handle exit intent detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Delay activation to let page load and cookies settle
    const activationTimer = setTimeout(() => {
      const handleMouseLeave = (e) => {
        // Only trigger when mouse leaves from the top of the viewport
        if (e.clientY <= 0 && shouldShowPopup()) {
          setHasTriggered(true);
          setIsVisible(true);
          setPopupCookie();
        }
      };

      document.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        document.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, 3000); // Wait 3 seconds before activating

    return () => clearTimeout(activationTimer);
  }, [shouldShowPopup, setPopupCookie]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className={styles.overlay} 
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div 
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-popup-title"
      >
        <button 
          className={styles.closeButton} 
          onClick={handleClose}
          aria-label="Close popup"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {status === 'success' ? (
          <div className={styles.successContent}>
            <div className={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className={styles.successTitle}>You're In!</h2>
            <p className={styles.successText}>
              Welcome to the Brakebee community. Watch your inbox for exclusive updates and offers.
            </p>
            <button className={styles.doneButton} onClick={handleClose}>
              Continue Browsing
            </button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h2 id="exit-popup-title" className={styles.title}>
                Wait! Before You Go...
              </h2>
              <p className={styles.subtitle}>
                Get exclusive updates, early access to art events, 
                and special offers delivered to your inbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={styles.input}
                  disabled={status === 'submitting'}
                  aria-label="Email address"
                />
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <span className={styles.spinner}></span>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
              
              {status === 'error' && (
                <p className={styles.errorMessage}>{errorMessage}</p>
              )}
            </form>

            <p className={styles.disclaimer}>
              No spam, ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

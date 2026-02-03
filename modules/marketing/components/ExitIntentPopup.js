/**
 * ExitIntentPopup - Global email collection popup
 * 
 * Shows when user moves mouse toward browser close/back
 * Only shows to new visitors (no existing cookies, not logged in)
 * Sets cookie to prevent showing again
 * 
 * Uses v2 API: POST /api/v2/marketing/newsletter/subscribe
 */

'use client';
import { useState, useEffect, useCallback } from 'react';
import { subscribeToNewsletter } from '../../../lib/marketing';

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

    // Don't show if user has interacted with site before
    if (document.cookie.includes('cookie_consent')) return false;

    return true;
  }, [hasTriggered]);

  // Set cookie to prevent showing popup again
  const setPopupCookie = useCallback(() => {
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
      await subscribeToNewsletter(email);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
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
    <div className="exit-popup-overlay" onClick={handleBackdropClick} role="presentation">
      <div className="exit-popup" role="dialog" aria-modal="true" aria-labelledby="exit-popup-title">
        <button className="exit-popup-close" onClick={handleClose} aria-label="Close popup">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {status === 'success' ? (
          <div className="exit-popup-success">
            <div className="exit-popup-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="exit-popup-title">You're In!</h2>
            <p className="exit-popup-text">
              Welcome to the Brakebee community. Watch your inbox for exclusive updates and offers.
            </p>
            <button className="btn btn-secondary" onClick={handleClose}>
              Continue Browsing
            </button>
          </div>
        ) : (
          <>
            <div className="exit-popup-header">
              <h2 id="exit-popup-title" className="exit-popup-title">
                Wait! Before You Go...
              </h2>
              <p className="exit-popup-subtitle">
                Get exclusive updates, early access to art events, 
                and special offers delivered to your inbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="exit-popup-form">
              <div className="exit-popup-input-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="form-input"
                  disabled={status === 'submitting'}
                  aria-label="Email address"
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <span className="spinner-small"></span>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
              
              {status === 'error' && (
                <p className="exit-popup-error">{errorMessage}</p>
              )}
            </form>

            <p className="exit-popup-disclaimer">
              No spam, ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .exit-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .exit-popup {
          position: relative;
          background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 48px 40px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .exit-popup-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.2s ease;
        }

        .exit-popup-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .exit-popup-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .exit-popup-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 12px 0;
          line-height: 1.2;
        }

        .exit-popup-subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.6;
        }

        .exit-popup-form {
          margin-bottom: 16px;
        }

        .exit-popup-input-group {
          display: flex;
          gap: 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .exit-popup-input-group:focus-within {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .exit-popup-input-group .form-input {
          flex: 1;
          padding: 16px 20px;
          font-size: 16px;
          border: none;
          background: transparent;
          color: #fff;
          outline: none;
          min-width: 0;
        }

        .exit-popup-input-group .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .exit-popup-input-group .btn {
          border-radius: 0;
          padding: 16px 28px;
        }

        .exit-popup-error {
          color: #ff6b6b;
          font-size: 13px;
          margin: 12px 0 0 0;
          text-align: center;
        }

        .exit-popup-disclaimer {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          margin: 0;
        }

        /* Success State */
        .exit-popup-success {
          text-align: center;
        }

        .exit-popup-success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(46, 204, 113, 0.2) 0%, rgba(39, 174, 96, 0.2) 100%);
          color: #2ecc71;
          margin-bottom: 24px;
        }

        .exit-popup-text {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .exit-popup-success .btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .exit-popup-success .btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .spinner-small {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 520px) {
          .exit-popup {
            padding: 40px 24px;
            margin: 0 16px;
          }

          .exit-popup-title {
            font-size: 24px;
          }

          .exit-popup-subtitle {
            font-size: 14px;
          }

          .exit-popup-input-group {
            flex-direction: column;
          }

          .exit-popup-input-group .form-input {
            padding: 14px 16px;
          }

          .exit-popup-input-group .btn {
            padding: 14px 24px;
          }
        }
      `}</style>
    </div>
  );
}

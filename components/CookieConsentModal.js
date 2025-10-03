import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '../lib/config';
// Using global CSS classes only

export default function CookieConsentModal({ onAccept, onDecline, isVisible = true }) {
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has already consented on component mount
  useEffect(() => {
    const hasConsented = localStorage.getItem('cookieConsent');
    if (hasConsented === 'true' && onAccept) {
      // User already consented, call onAccept immediately
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = async () => {
    setIsLoading(true);
    
    try {
      // Store consent in localStorage immediately
      localStorage.setItem('cookieConsent', 'true');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      
      // Log anonymous consent to backend for audit trail
      const sessionId = getOrCreateSessionId();
      await fetch(getApiUrl('auth/cookie-consent/anonymous'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consent: 'yes',
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        })
      });

      // Call parent callback
      if (onAccept) {
        onAccept();
      }
    } catch (error) {
      console.error('Error logging cookie consent:', error);
      // Still proceed with consent - localStorage is sufficient
      if (onAccept) {
        onAccept();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    // Don't store anything in localStorage for decline
    // Just call the decline callback
    if (onDecline) {
      onDecline();
    }
  };

  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">🍪 Cookie Consent Required</h2>
        
        <p>
          To access our login and signup features, you must accept our use of cookies. 
          We use cookies for:
        </p>
        
        <div className="form-card">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>• Authentication</li>
            <li>• Analytics</li>
            <li>• AI Training</li>
            <li>• Internal Marketing</li>
          </ul>
        </div>
        
        <div className="warning-alert">
          <strong>All cookies are required to use our platform.</strong> 
          If you decline, you can continue browsing publicly but cannot create an account or log in.
        </div>
        
        <p style={{ textAlign: 'center', margin: '20px 0' }}>
          <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>
          <Link href="/cookie-policy" target="_blank">Cookie Policy</Link>
        </p>
        
        <div className="modal-actions">
          <button 
            onClick={handleDecline}
            className="secondary"
            disabled={isLoading}
          >
            Decline & Browse Publicly
          </button>
          <button 
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Accept All Cookies & Continue'}
          </button>
        </div>
        
        <small style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
          By clicking "Accept All Cookies", you agree to our use of all cookies as described in our Privacy Policy.
        </small>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Welcome banner for users redirected from Online Art Festival (OAF)
 * Shows once per browser when arriving with ?from=oaf parameter
 * Stores dismissal in localStorage to prevent repeat shows
 */
export default function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user came from OAF redirect
    const urlParams = new URLSearchParams(window.location.search);
    const fromOAF = urlParams.get('from') === 'oaf';

    if (!fromOAF) return;

    // Check if user has already dismissed
    const dismissed = localStorage.getItem('oaf_welcome_dismissed');
    if (dismissed) return;

    // Show after brief delay
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [router.asPath]);

  const handleDismiss = () => {
    localStorage.setItem('oaf_welcome_dismissed', new Date().toISOString());
    setIsVisible(false);

    // Clean up URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={handleDismiss}
      onKeyDown={(e) => e.key === 'Escape' && handleDismiss()}
      role="presentation"
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-banner-title"
      >
        <button className="modal-close" onClick={handleDismiss} aria-label="Close">
          &times;
        </button>

        <h2 id="welcome-banner-title" className="modal-title">Welcome to Brakebee!</h2>
        
        <p>
          <strong>Online Art Festival</strong> has moved to Brakebee. 
          Please update your bookmarks.
        </p>

        <div className="modal-actions">
          <button onClick={handleDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

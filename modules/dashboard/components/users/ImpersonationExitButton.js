'use client';
import { useState, useEffect } from 'react';
import { 
  stopImpersonation,
  getImpersonationStatus 
} from '../../../../lib/auth';

/**
 * ImpersonationExitButton Component
 * 
 * Floating button that appears when an admin is impersonating a user.
 * Provides a clear visual indicator and quick exit from impersonation mode.
 * 
 * Usage: Import and render in header components
 * The component automatically shows/hides based on token state.
 */
export default function ImpersonationExitButton() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [originalUserId, setOriginalUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkImpersonationStatus();
    
    // Also check on window focus (in case token changes)
    const handleFocus = () => checkImpersonationStatus();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const checkImpersonationStatus = () => {
    const status = getImpersonationStatus();
    
    if (status && status.isImpersonating) {
      setIsImpersonating(true);
      setOriginalUserId(status.originalUserId);
      setImpersonatedUser({
        id: status.impersonatedUserId,
        username: status.impersonatedUsername
      });
    } else {
      setIsImpersonating(false);
    }
  };

  const handleExitImpersonation = async () => {
    setLoading(true);
    
    try {
      const success = await stopImpersonation();
      
      if (success) {
        // Small delay to ensure tokens are saved before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard after exiting impersonation
        window.location.href = '/dashboard';
      } else {
        alert('Failed to exit impersonation. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      alert('Failed to exit impersonation. Please try again.');
      setLoading(false);
    }
  };

  // Don't render if not impersonating
  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="impersonation-banner">
      <style jsx>{`
        .impersonation-banner {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          background-color: #ff6b6b;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 280px;
          max-width: 320px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .impersonation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .impersonation-header strong {
          font-size: 14px;
          font-weight: 600;
        }
        
        .impersonation-user {
          font-size: 13px;
          opacity: 0.95;
          line-height: 1.4;
        }
        
        .impersonation-exit-btn {
          margin-top: 8px;
          padding: 10px 16px;
          background-color: white;
          color: #ff6b6b;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        
        .impersonation-exit-btn:hover:not(:disabled) {
          background-color: #f8f9fa;
          transform: scale(1.02);
        }
        
        .impersonation-exit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .impersonation-footer {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 2px;
          text-align: center;
        }
      `}</style>
      
      <div className="impersonation-header">
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <strong>Impersonating User</strong>
      </div>
      
      <div className="impersonation-user">
        Acting as: <strong>{impersonatedUser?.username || 'Unknown User'}</strong>
      </div>
      
      <button
        onClick={handleExitImpersonation}
        disabled={loading}
        className="impersonation-exit-btn"
      >
        {loading ? 'Exiting...' : '← Exit Impersonation'}
      </button>
      
      <div className="impersonation-footer">
        All actions are logged
      </div>
    </div>
  );
}

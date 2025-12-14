'use client';
import { useState, useEffect } from 'react';
import { getAuthToken, authenticatedApiRequest } from '../lib/csrf';
import { getApiUrl } from '../lib/config';

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
    try {
      const token = getAuthToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        if (payload.isImpersonating) {
          setIsImpersonating(true);
          setOriginalUserId(payload.originalUserId);
          setImpersonatedUser({
            id: payload.userId,
            username: payload.username
          });
        } else {
          setIsImpersonating(false);
        }
      }
    } catch (error) {
      console.error('Error checking impersonation status:', error);
    }
  };

  const handleExitImpersonation = async () => {
    setLoading(true);
    
    try {
      // Call stop-impersonation endpoint
      const response = await authenticatedApiRequest(
        getApiUrl('admin/stop-impersonation'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        // Restore original admin token
        const originalToken = localStorage.getItem('originalAdminToken');
        const originalRefreshToken = localStorage.getItem('originalAdminRefreshToken');
        
        // Import cookie config once
        const { getCookieConfig } = await import('../lib/config');
        const cookieSettings = getCookieConfig();
        
        if (originalToken) {
          localStorage.setItem('token', originalToken);
          localStorage.removeItem('originalAdminToken');
          
          // Update cookie as well
          document.cookie = `token=${originalToken}; ${cookieSettings}; max-age=7200`;
        }
        
        if (originalRefreshToken) {
          localStorage.setItem('refreshToken', originalRefreshToken);
          localStorage.removeItem('originalAdminRefreshToken');
          
          // Update cookie as well
          document.cookie = `refreshToken=${originalRefreshToken}; ${cookieSettings}; max-age=604800`;
        }
        
        // Small delay to ensure tokens are saved before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to dashboard after exiting impersonation
        window.location.href = '/dashboard';
      } else {
        alert('Failed to exit impersonation: ' + (data.error || 'Unknown error'));
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
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      backgroundColor: '#ff6b6b',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '280px',
      maxWidth: '320px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <strong style={{ fontSize: '14px', fontWeight: '600' }}>Impersonating User</strong>
      </div>
      
      <div style={{ 
        fontSize: '13px', 
        opacity: 0.95,
        lineHeight: '1.4'
      }}>
        Acting as: <strong>{impersonatedUser?.username || 'Unknown User'}</strong>
      </div>
      
      <button
        onClick={handleExitImpersonation}
        disabled={loading}
        style={{
          marginTop: '8px',
          padding: '10px 16px',
          backgroundColor: 'white',
          color: '#ff6b6b',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = '#f8f9fa';
            e.target.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'white';
          e.target.style.transform = 'scale(1)';
        }}
      >
        {loading ? 'Exiting...' : '← Exit Impersonation'}
      </button>
      
      <div style={{ 
        fontSize: '11px', 
        opacity: 0.8,
        marginTop: '2px',
        textAlign: 'center'
      }}>
        All actions are logged
      </div>
    </div>
  );
}


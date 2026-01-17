import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { clearAuthTokens, getRefreshToken } from '../lib/auth';
import { getApiUrl } from '../lib/config';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Get refresh token before clearing (needed for API call)
        const refreshToken = getRefreshToken();
        
        // Call v2 logout endpoint if we have a refresh token
        if (refreshToken) {
          try {
            await fetch(getApiUrl('api/v2/auth/logout'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({ refreshToken }),
              credentials: 'include'
            });
          } catch (e) {
            // Ignore API errors - we'll clear tokens locally anyway
          }
        }
        
        // Clear all auth tokens (cookies + localStorage)
        clearAuthTokens();
        
        // Preserve non-auth localStorage items
        const cookieConsent = localStorage.getItem('cookieConsent_v2');
        const cookieConsentDate = localStorage.getItem('cookieConsentDate');
        const sessionId = localStorage.getItem('sessionId');
        
        // Clear remaining localStorage
        localStorage.clear();
        
        // Restore preserved items
        if (cookieConsent) localStorage.setItem('cookieConsent_v2', cookieConsent);
        if (cookieConsentDate) localStorage.setItem('cookieConsentDate', cookieConsentDate);
        if (sessionId) localStorage.setItem('sessionId', sessionId);
        
        // Redirect to home page
        setTimeout(() => {
          router.push('/');
        }, 100);
      } catch (error) {
        // On any error, still clear tokens and redirect
        clearAuthTokens();
        router.push('/');
      }
    };
    
    performLogout();
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Logging out...</h1>
      <p>Please wait while we clear your session.</p>
    </div>
  );
} 
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCookieConfig } from '../lib/config';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    // Clear all authentication cookies with both old and new domain settings
    const cookieConfig = getCookieConfig();
    const expiredCookie = `expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${cookieConfig.domain}`;
    
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `token=; ${expiredCookie}`;
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `refreshToken=; ${expiredCookie}`;
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `csrf-token=; ${expiredCookie}`;
    document.cookie = 'csrf-secret=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `csrf-secret=; ${expiredCookie}`;
    
    // Clear authentication-related localStorage only (preserve cookie consent)
    const cookieConsent = localStorage.getItem('cookieConsent_v2');
    const cookieConsentDate = localStorage.getItem('cookieConsentDate');
    const sessionId = localStorage.getItem('sessionId');
    
    localStorage.clear();
    
    // Restore cookie consent and session ID
    if (cookieConsent) localStorage.setItem('cookieConsent_v2', cookieConsent);
    if (cookieConsentDate) localStorage.setItem('cookieConsentDate', cookieConsentDate);
    if (sessionId) localStorage.setItem('sessionId', sessionId);
    
    // Redirect to home page
    setTimeout(() => {
      router.push('/');
    }, 100);
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Logging out...</h1>
      <p>Please wait while we clear your session.</p>
    </div>
  );
} 
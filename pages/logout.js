import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCookieConfig } from '../lib/config';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    // Clear all authentication cookies with both old and new domain settings
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${getCookieConfig()}`;
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=';
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=';
    document.cookie = 'csrf-secret=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'csrf-secret=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=';
    
    // Clear localStorage
    localStorage.clear();
    
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
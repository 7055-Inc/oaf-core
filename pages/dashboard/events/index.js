/**
 * Events Section Index
 * Redirects to My Events by default
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function EventsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/events/mine');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '200px' 
    }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
    </div>
  );
}

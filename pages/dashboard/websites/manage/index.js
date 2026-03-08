/**
 * Redirect /dashboard/websites/manage (no id) to My Sites.
 * Prevents 404 when prefetch or navigation hits manage without an id.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ManageSiteIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/websites/mine');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to My Sites...</p>
    </div>
  );
}

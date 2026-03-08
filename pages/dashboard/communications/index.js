/**
 * Communications Index Page
 * Redirects to tickets
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CommunicationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/communications/tickets');
  }, [router]);

  return null;
}

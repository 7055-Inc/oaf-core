/**
 * Commerce Dashboard Index
 * Redirects to My Orders
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CommercePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/commerce/orders');
  }, [router]);

  return null;
}

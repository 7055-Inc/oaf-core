/**
 * Redirect: old "commerce admin" URL → All Orders (admin) page.
 * The admin all-orders view lives at /dashboard/commerce/all-orders.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CommerceAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/commerce/all-orders');
  }, [router]);

  return null;
}

import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * System Dashboard Index
 * Redirects to Homepage management (first item in System menu)
 */
export default function SystemIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/system/homepage');
  }, [router]);

  return null;
}

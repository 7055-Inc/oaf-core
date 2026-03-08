import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Leo AI Dashboard Index
 * Redirects to the Manual Sync page (primary Leo admin interface)
 */
export default function LeoIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/leo/sync');
  }, [router]);

  return null;
}

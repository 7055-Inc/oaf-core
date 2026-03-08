import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function WebsitesIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/websites/mine');
  }, [router]);
  return null;
}

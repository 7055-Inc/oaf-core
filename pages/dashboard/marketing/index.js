import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Marketing Dashboard Index
 * Redirects to Share Content page
 */
export default function MarketingIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/marketing/share-content');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div className="loading-spinner">Redirecting...</div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

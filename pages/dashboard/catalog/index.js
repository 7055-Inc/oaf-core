/**
 * Catalog Section Index
 * /dashboard/catalog
 * 
 * Redirects to My Products page.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CatalogIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/catalog/products');
  }, [router]);
  
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

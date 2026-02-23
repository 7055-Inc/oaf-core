/**
 * My Products Page
 * /dashboard/catalog/products
 * 
 * Lists the current user's products with management capabilities.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { ProductList } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';

export default function MyProductsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <>
      <Head>
        <title>My Products | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>My Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <ProductList userData={userData} adminView={false} />
      </DashboardShell>
    </>
  );
}

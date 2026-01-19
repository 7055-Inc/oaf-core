/**
 * Admin All Products Page
 * /dashboard/catalog/admin
 * 
 * Admin view of all products across all vendors.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { ProductList } from '../../../../modules/dashboard/components/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AdminProductsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          
          // Check admin permission
          if (data.user_type !== 'admin') {
            router.push('/dashboard/catalog/products');
            return;
          }
          
          setUserData(data);
        } else {
          router.push('/login');
        }
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
        <title>All Products | Admin Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>All Products</h1>
          <p className="page-subtitle">Admin view of all vendor products</p>
        </div>
        
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <strong>Admin View:</strong> You are viewing products from all vendors.
        </div>
        
        <ProductList userData={userData} adminView={true} />
      </DashboardShell>
    </>
  );
}

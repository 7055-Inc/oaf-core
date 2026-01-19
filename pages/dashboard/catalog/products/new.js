/**
 * Create New Product Page
 * /dashboard/catalog/products/new
 * 
 * Uses the accordion-based ProductForm component within DashboardShell.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { ProductForm } from '../../../../modules/dashboard/components/catalog';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function NewProductPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
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
        <title>Add New Product | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button 
              onClick={() => router.push('/dashboard/catalog/products')}
              className="btn btn-secondary btn-sm"
            >
              <i className="fas fa-arrow-left"></i> Back to Products
            </button>
          </div>
          <h1>Add New Product</h1>
        </div>
        <ProductForm userData={userData} />
      </DashboardShell>
    </>
  );
}

/**
 * Edit Product Page
 * /dashboard/catalog/products/edit/[id]
 * 
 * Uses the same ProductForm component as the "new" page,
 * but pre-filled with existing product data.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../../modules/dashboard/components/layout';
import { ProductForm } from '../../../../../modules/dashboard/components/catalog';
import { fetchProduct } from '../../../../../lib/catalog';
import { getCurrentUser } from '../../../../../lib/users';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [userData, setUserData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    async function loadData() {
      try {
        // Load user data via v2 API
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserData(user);

        // Load product data via v2 API
        const product = await fetchProduct(id, 'inventory,images,children');
        setProductData(product);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={() => router.push('/dashboard/catalog/products')}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Back to Products
        </button>
      </div>
    );
  }

  if (!userData || !productData) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Edit Product | Dashboard</title>
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
          <h1>Edit Product</h1>
          <p className="page-subtitle">{productData.name}</p>
        </div>
        <ProductForm 
          userData={userData} 
          productId={parseInt(id)} 
          initialData={productData}
        />
      </DashboardShell>
    </>
  );
}

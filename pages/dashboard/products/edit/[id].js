'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../../../components/Header';
import { authApiRequest } from '../../../../lib/apiUtils';
import ProductForm from '../../../../components/dashboard/manage-my-store/product-form';

/**
 * Edit Product Page (New Modular Version)
 * Uses the new accordion-based ProductForm component
 */
export default function EditProductPage() {
  const [product, setProduct] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const params = useParams();
  const productId = params?.id;

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch product and user data in parallel
      const [productRes, userRes] = await Promise.all([
        authApiRequest(`products/${productId}`),
        authApiRequest('users/me')
      ]);
      
      const productData = await productRes.json();
      const userData = await userRes.json();
      
      // API returns product directly (or { error: ... } on failure)
      if (productData.error) {
        throw new Error(productData.error);
      }
      
      if (!productData.id) {
        throw new Error('Product not found');
      }
      
      setProduct(productData);
      setUserData(userData);
    } catch (err) {
      console.error('Error loading product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div style={{
          maxWidth: '900px',
          margin: '40px auto',
          padding: '0 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#666' }}>Loading product...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div style={{
          maxWidth: '900px',
          margin: '40px auto',
          padding: '0 20px'
        }}>
          <div style={{
            padding: '24px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error Loading Product</div>
            <div>{error}</div>
            <button
              onClick={() => router.back()}
              style={{
                marginTop: '16px',
                padding: '10px 24px',
                background: '#721c24',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{
        maxWidth: '900px',
        margin: '40px auto',
        padding: '0 20px'
      }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color, #055474)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Product Form */}
        <ProductForm
          userData={userData}
          productId={productId}
          initialData={product}
        />
      </div>
    </>
  );
}


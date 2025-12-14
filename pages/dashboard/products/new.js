'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { authApiRequest } from '../../../lib/apiUtils';
import ProductForm from '../../../components/dashboard/manage-my-store/product-form';

/**
 * Create New Product Page
 * Uses the new accordion-based ProductForm component
 */
export default function NewProductPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const res = await authApiRequest('users/me');
      const data = await res.json();
      setUserData(data);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load user data');
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
          <div style={{ color: '#666' }}>Loading...</div>
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
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error</div>
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
        <ProductForm userData={userData} />
      </div>
    </>
  );
}


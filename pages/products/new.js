'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import ProductTypeModal from '../../components/ProductTypeModal';
import { authApiRequest } from '../../lib/apiUtils';

/**
 * New Product Page
 * 
 * Shows the ProductTypeModal, creates a minimal draft product,
 * and redirects to the edit page for completion.
 */
export default function NewProduct() {
  const [showModal, setShowModal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Generate a unique SKU for the draft
  const generateDraftSKU = () => {
    const timestamp = Date.now().toString().slice(-8);
    return `DRAFT-${timestamp}`;
  };

  // Handle product type selection
  const handleProductTypeSelection = async (type) => {
    setLoading(true);
    setError(null);
    setShowModal(false);

    try {
      // Create a draft product with minimal required fields
      // API requires name and price to be set, even for drafts
      const draftPayload = {
        product_type: type,
        name: 'Untitled Product', // Placeholder - user will update on edit page
        price: 0.01, // Minimum price - user will update
        sku: generateDraftSKU(),
        category_id: 1, // Default "Uncategorized"
        status: 'draft',
        ship_method: 'free',
        allow_returns: '30_day',
        marketplace_enabled: true // Default to marketplace ON
      };

      const response = await authApiRequest('products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftPayload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create draft product');
      }

      // API returns { success: true, product: { id, ... } } or { id, ... } directly
      const productId = data.product?.id || data.id;
      
      if (!productId) {
        throw new Error('No product ID returned from API');
      }
      
      // Redirect to the edit page
      router.push(`/dashboard/products/edit/${productId}`);
      
    } catch (err) {
      setError(err.message);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      
      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}><i className="fas fa-spinner fa-spin"></i></div>
            <div style={{ fontSize: '18px', color: '#333' }}>Creating your product...</div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              You'll be redirected to complete setup
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && !showModal && (
        <div style={{
          maxWidth: '500px',
          margin: '60px auto',
          padding: '24px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}><i className="fas fa-exclamation-triangle"></i></div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Something went wrong</div>
          <div style={{ marginBottom: '16px' }}>{error}</div>
          <button
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
            style={{
              padding: '10px 24px',
              background: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Product Type Modal */}
      <ProductTypeModal 
        isOpen={showModal && !loading} 
        onSelectType={handleProductTypeSelection} 
      />
    </>
  );
}

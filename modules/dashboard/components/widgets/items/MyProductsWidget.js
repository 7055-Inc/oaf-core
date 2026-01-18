import React, { useState, useEffect } from 'react';
import { authApiRequest, API_ENDPOINTS } from '../../../../../lib/apiUtils';
import { config, getSmartMediaUrl } from '../../../../../lib/config';
import styles from './my-products/my-products.module.css';

export default function MyProductsWidget({ config: widgetConfig, onConfigChange }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // Handle new format: {url, is_primary} or old format: string
      const imageUrl = typeof image === 'string' ? image : image.url;
      // For temp images, serve directly from API domain
      if (imageUrl.startsWith('/temp_images/') || imageUrl.startsWith('/tmp/')) {
        return `${config.API_BASE_URL}${imageUrl}`;
      }
      // For processed images with media IDs, use smart serving
      return getSmartMediaUrl(imageUrl);
    }
    return null;
  };

  // Load initial data when component mounts
  useEffect(() => {
    // Set grid span immediately
    if (onConfigChange) {
      onConfigChange({ 
        gridSpan: 3
      });
    }
    loadProductsData();
  }, []);

  const loadProductsData = async () => {
    try {
      const response = await authApiRequest(
        `${API_ENDPOINTS.PRODUCTS}/my?limit=5&include=images`
      );

      if (response.ok) {
        const result = await response.json();
        const productsData = result.products || [];
        setProducts(productsData);
      } else {
        throw new Error('Failed to load products');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadProductsData();
  };

  const handleSeeMore = () => {
    // Open the my products slide-in panel
    const event = new CustomEvent('dashboard-open-slide-in', {
      detail: {
        type: 'my-products',
        title: 'My Products'
      }
    });
    window.dispatchEvent(event);
  };

  const handleRemoveWidget = async () => {
    if (confirm('Are you sure you want to remove the My Products widget from your dashboard?')) {
      try {
        const response = await authApiRequest(API_ENDPOINTS.DASHBOARD_WIDGETS_REMOVE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgetType: 'my_products' })
        });

        if (response.ok) {
          // Refresh the dashboard to remove the widget
          window.location.reload();
        } else {
          throw new Error('Failed to remove widget');
        }
      } catch (err) {
        console.error('Error removing widget:', err);
        alert('Failed to remove widget. Please try again.');
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className={styles.productsWidget}>
        <div className={styles.loadingState}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.productsWidget}>
      <div className={styles.productsHeader}>
        <span className={styles.productsTitle}>My Products</span>
        <div className={styles.productsHeaderRight}>
          <i 
            className="fas fa-sync-alt" 
            title="Refresh" 
            onClick={handleRefresh}
            style={{ cursor: 'pointer', marginRight: '10px' }}
          ></i>
          <i 
            className="fas fa-times" 
            title="Remove Widget" 
            onClick={handleRemoveWidget}
            style={{ cursor: 'pointer', color: '#dc3545' }}
          ></i>
        </div>
      </div>
      
      {error && (
        <div className={styles.productsError}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-box-open"></i>
          <span>No products yet</span>
        </div>
      ) : (
        <>
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={product.title} />
                  ) : (
                    <div className={styles.noImage}>
                      <i className="fas fa-image"></i>
                    </div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <div className={styles.productTitle}>{product.title}</div>
                  <div className={styles.productPrice}>${product.price}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.seeMoreContainer}>
            <button className={styles.seeMoreButton} onClick={handleSeeMore}>
              See More
            </button>
          </div>
        </>
      )}
    </div>
  );
}

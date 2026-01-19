/**
 * ProductGrid Component
 * 
 * Grid layout for displaying multiple ProductCards.
 * Handles responsive layout and loading states.
 */

import ProductCard from './ProductCard';

export default function ProductGrid({ 
  products = [], 
  loading = false,
  showVendor = false,
  columns = 4,
  emptyMessage = 'No products found',
  className = ''
}) {
  if (loading) {
    return (
      <div className={`product-grid product-grid-${columns} ${className}`}>
        {[...Array(columns * 2)].map((_, i) => (
          <div key={i} className="product-card product-card-skeleton">
            <div className="product-card-image skeleton"></div>
            <div className="product-card-info">
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text-short"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="product-grid-empty">
        <i className="fas fa-box-open"></i>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`product-grid product-grid-${columns} ${className}`}>
      {products.map(product => (
        <ProductCard 
          key={product.id} 
          product={product}
          showVendor={showVendor}
        />
      ))}
    </div>
  );
}

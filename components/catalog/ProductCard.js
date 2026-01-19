/**
 * ProductCard Component
 * 
 * Reusable product card for displaying product in grids/lists.
 * Used by public product pages and carousels.
 */

import Link from 'next/link';
import { config } from '../../lib/config';

/**
 * Get display URL for product image
 */
const getImageUrl = (product) => {
  // Check for processed image first
  if (product.processedImageUrl) {
    return product.processedImageUrl;
  }
  
  // Check images array
  if (product.images && product.images.length > 0) {
    const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
    const imageUrl = primaryImage.url || primaryImage.image_url;
    
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      } else if (imageUrl.startsWith('/temp_images/')) {
        return `${config.API_BASE_URL}${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        return imageUrl;
      } else {
        return `/api/media/serve/${imageUrl}`;
      }
    }
  }
  
  return null;
};

/**
 * Format price for display
 */
const formatPrice = (price) => {
  return `$${parseFloat(price || 0).toFixed(2)}`;
};

export default function ProductCard({ 
  product, 
  showVendor = false,
  className = '',
  linkTarget = '_self'
}) {
  const imageUrl = getImageUrl(product);
  const href = `/products/${product.id}`;

  return (
    <Link 
      href={href} 
      className={`product-card ${className}`}
      target={linkTarget}
    >
      <div className="product-card-image">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="product-card-no-image">
            <i className="fas fa-image"></i>
          </div>
        )}
      </div>
      
      <div className="product-card-info">
        <h3 className="product-card-name">{product.name}</h3>
        
        {showVendor && product.vendor && (
          <p className="product-card-vendor">
            {product.vendor.display_name || product.vendor.business_name || 'Artist'}
          </p>
        )}
        
        <div className="product-card-price">
          {formatPrice(product.price)}
        </div>
      </div>
    </Link>
  );
}

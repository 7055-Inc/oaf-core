import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import styles from './VisualDiscoveryBand.module.css';

const VisualDiscoveryBand = () => {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeroFeed();
  }, []);

  const fetchHeroFeed = async () => {
    try {
      setLoading(true);
      
      // Get user ID from JWT token
      const token = localStorage.getItem('token');
      let userId = 'anonymous';
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || 'anonymous';
        } catch (e) {
          console.warn('Could not decode JWT token');
        }
      }

      // Try Leo AI smart recommendations first
      try {
        const smartResponse = await fetch('/api/leo-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'homepage recommendations',
            userId: userId,
            options: { 
              limit: 6,
              recommendationMode: true,
              includeMetaTruths: true,
              applyPersonalization: true
            }
          })
        });

        if (smartResponse.ok) {
          const smartData = await smartResponse.json();
          
          // Extract product IDs from Leo AI recommendations
          const productIds = [];
          if (smartData.categories?.products) {
            smartData.categories.products.forEach(item => {
              // Extract product ID from metadata
              const productId = item.metadata?.product_id || item.metadata?.original_id;
              if (productId && !productIds.includes(productId)) {
                productIds.push(productId);
              }
            });
          }

          // If we have product IDs, fetch clean data from SQL API
          if (productIds.length > 0) {
            const productTiles = await fetchProductTiles(productIds.slice(0, 6));
            if (productTiles.length > 0) {
              console.log(`✨ Using ${productTiles.length} Leo AI smart product recommendations`);
              setTiles(productTiles);
              return;
            }
          }

          // Fallback: process other categories (artists, articles, events) the old way
          const smartTiles = [];
          ['artists', 'articles', 'events'].forEach(category => {
            if (smartData.categories?.[category]) {
              smartData.categories[category].forEach(item => {
                if (smartTiles.length < 6) {
                  // Skip low-quality items
                  if (item.metadata?.status === 'deleted' || 
                      item.title?.includes('logo.png') || 
                      item.title?.includes('Logo.png') ||
                      item.content?.includes('Table:') ||
                      item.metadata?.source_table === 'pending_images' ||
                      item.metadata?.source_table === 'product_images' ||
                      item.metadata?.source_table === 'cart_collections' ||
                      item.metadata?.source_table === 'website_templates') {
                    return;
                  }

                  // Extract clean title
                  let cleanTitle = item.title || 'Featured Item';
                  if (cleanTitle.startsWith('name: ')) {
                    cleanTitle = cleanTitle.replace('name: ', '').split('.')[0];
                  }
                  if (cleanTitle.startsWith('template_name: ')) {
                    cleanTitle = cleanTitle.replace('template_name: ', '').split('.')[0];
                  }

                  smartTiles.push({
                    id: item.id,
                    title: cleanTitle,
                    image: item.metadata?.image_url || item.metadata?.profile_image_path,
                    href: getItemUrl(item, category),
                    alt: `${cleanTitle} - ${category}`,
                    category: category,
                    confidence: item.relevance || 0,
                    aiEnhanced: item.learningEnhanced || false
                  });
                }
              });
            }
          });

          if (smartTiles.length >= 1) {
            console.log(`✨ Using ${smartTiles.length} Leo AI smart non-product recommendations`);
            setTiles(smartTiles);
            return;
          }
        }
      } catch (smartError) {
        console.warn('Smart recommendations failed, falling back to hero feed:', smartError);
      }

      // If Leo AI can't provide recommendations, the system is down
      throw new Error('Leo AI recommendations unavailable - system may be down');
      
    } catch (err) {
      console.error('Failed to fetch hero feed:', err);
      setError(err.message);
      setTiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch clean product data from SQL API
  const fetchProductTiles = async (productIds) => {
    const tiles = [];
    
    try {
      // Fetch each product individually to get clean data
      const productPromises = productIds.map(async (productId) => {
        try {
          const response = await fetch(getApiUrl(`products/${productId}?include=images,vendor`));
          if (response.ok) {
            const productData = await response.json();
            
            // Only include active products
            if (productData.status !== 'active') return null;
            
            // Get image URL using same logic as RandomProductCarousel
            let imageUrl = null;
            // Check for image_url first (main product image field)
            if (productData.image_url) {
              if (productData.image_url.startsWith('http')) {
                imageUrl = productData.image_url;
              } else {
                imageUrl = getApiUrl(`api/media/serve/${productData.image_url}`);
              }
            }
            // Check for images array as fallback
            else if (productData.images && productData.images.length > 0) {
              const img = productData.images[0];
              if (img.startsWith('http')) {
                imageUrl = img;
              } else {
                imageUrl = getApiUrl(`api/media/serve/${img}`);
              }
            }
            
            return {
              id: `product-${productData.id}`,
              title: productData.name || 'Untitled Product',
              image: imageUrl,
              href: `/products/${productData.id}`,
              alt: productData.name || 'Product',
              category: 'product',
              price: productData.price,
              vendor: productData.vendor?.display_name || productData.vendor?.business_name,
              aiEnhanced: true
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch product ${productId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(productPromises);
      return results.filter(result => result !== null);
      
    } catch (error) {
      console.error('Failed to fetch product tiles:', error);
      return [];
    }
  };

  // Helper function to generate appropriate URLs for different item types
  const getItemUrl = (item, category) => {
    switch (category) {
      case 'products':
        return `/products/${item.id}`;
      case 'artists':
        return `/artists/${item.id}`;
      case 'articles':
        return `/articles/${item.id}`;
      case 'events':
        return `/events/${item.id}`;
      default:
        return '#';
    }
  };

  if (loading) {
    return (
      <section className={styles.visualBand}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Discovering amazing art...</p>
        </div>
      </section>
    );
  }

  // If there's an error or no tiles, hide the component entirely
  if (error || tiles.length === 0) {
    return null;
  }

  return (
    <section className={styles.visualBand}>
      <div className={styles.container}>
        <div className={styles.mosaicGrid}>
          {tiles.map((tile, index) => (
            <div 
              key={tile.id || index}
              className={`${styles.tile} ${styles[`tile${index + 1}`]}`}
              onClick={() => tile.href && (window.location.href = tile.href)}
            >
              {tile.image && (
                <img 
                  src={tile.image} 
                  alt={tile.alt || tile.title || 'Art piece'}
                  className={styles.tileImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div className={styles.tileOverlay}>
                <div className={styles.tileContent}>
                  {tile.title && (
                    <h3 className={styles.tileTitle}>{tile.title}</h3>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisualDiscoveryBand;

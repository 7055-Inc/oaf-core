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
      setError(null);
      
      // Get user ID from JWT token
      const token = localStorage.getItem('token');
      let userId = 'anonymous';
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.id || 'anonymous';
        } catch (e) {
          // JWT decode failed, continue with anonymous
        }
      }

      // Try Leo AI smart recommendations first
      try {
        const smartResponse = await fetch(getApiUrl('api/leo/search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'active product recommendations for homepage',
            userId: userId,
            options: { 
              limit: 6,
              recommendationMode: true,
              includeMetaTruths: true,
              applyPersonalization: true,
              categories: ['products']
            }
          })
        });
        
        if (smartResponse.ok) {
          const smartData = await smartResponse.json();
          
          // Extract product IDs from Leo AI recommendations
          const productIds = [];
          if (smartData.results?.products) {
            smartData.results.products.forEach(item => {
              // Extract product ID from metadata or direct id
              const productId = item.metadata?.product_id || item.metadata?.original_id || item.id;
              if (productId && !productIds.includes(productId)) {
                productIds.push(productId);
              }
            });
          }

          // If we have product IDs, fetch clean data from SQL API
          if (productIds.length > 0) {
            const productTiles = await fetchProductTiles(productIds.slice(0, 6));
            if (productTiles.length > 0) {
              setTiles(productTiles);
              return;
            }
          }

          // Fallback: process other categories (artists, articles, events)
          const smartTiles = [];
          ['artists', 'articles', 'events'].forEach(category => {
            if (smartData.results?.[category]) {
              smartData.results[category].forEach(item => {
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
                  let cleanTitle = item.title || item.name || 'Featured Item';
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
            setTiles(smartTiles);
            return;
          }
        }
      } catch (smartError) {
        // Leo AI failed, but this shouldn't break the component
        // Just continue to show nothing (component will hide itself)
      }

      // If Leo AI can't provide recommendations, gracefully hide the component
      setTiles([]);
      
    } catch (err) {
      // Failed to fetch hero feed, hide component
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
          const url = getApiUrl(`products/${productId}?include=images,vendor`);
          const response = await fetch(url);
          if (response.ok) {
            const productData = await response.json();
            
            // Only show active products (filter out deleted, hidden, etc.)
            if (productData.status !== 'active') {
              return null;
            }
            
            // Get image URL using proper media serving logic
            let imageUrl = null;
            // Check for image_url first (main product image field)
            if (productData.image_url) {
              if (productData.image_url.startsWith('http')) {
                imageUrl = productData.image_url;
              } else {
                // Remove leading slash if present and use proper media endpoint
                const cleanPath = productData.image_url.replace(/^\//, '');
                imageUrl = getApiUrl(`api/media/serve/${cleanPath}`);
              }
            }
            // Check for images array as fallback
            else if (productData.images && productData.images.length > 0) {
              const image = productData.images[0];
              // Handle new format: {url, is_primary} or old format: string
              const img = typeof image === 'string' ? image : image.url;
              if (img.startsWith('http')) {
                imageUrl = img;
              } else {
                // Remove leading slash if present and use proper media endpoint
                const cleanPath = img.replace(/^\//, '');
                imageUrl = getApiUrl(`api/media/serve/${cleanPath}`);
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
          return null;
        }
      });
      
      const results = await Promise.all(productPromises);
      return results.filter(result => result !== null);
      
    } catch (error) {
      // Failed to fetch product tiles, return empty array
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

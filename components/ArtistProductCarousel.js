import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';
import styles from './ArtistProductCarousel.module.css';

const ArtistProductCarousel = ({ vendorId, currentProductId, artistName }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extendedProducts, setExtendedProducts] = useState([]);
  const scrollContainerRef = useRef(null);
  const animationRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!vendorId) return;

    const fetchArtistProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(getApiUrl(`products/all?vendor_id=${vendorId}&include=images`));
        
        if (!res.ok) {
          throw new Error('Failed to fetch artist products');
        }
        
        const data = await res.json();
        
        // Extract products array from response
        const productsArray = data.products || data || [];
        
        // Filter out the current product, drafts, and child variants (show parents only)
        // Limit to 12 products max
        const otherProducts = productsArray.filter(product => 
          product.id !== currentProductId && 
          product.status === 'active' &&
          product.name && 
          product.name.toLowerCase() !== 'new product draft' &&
          !product.parent_id // Only show parent products, not variants
        ).slice(0, 12);
        
        // Process image URLs - API returns images: [{url: "...", is_primary: bool}]
        const processedProducts = otherProducts.map(product => {
          let imageUrl = null;
          
          // Get image from images array
          if (product.images && product.images.length > 0) {
            const firstImg = product.images[0];
            imageUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
          }
          
          // Convert relative URL to absolute using API base
          if (imageUrl && !imageUrl.startsWith('http')) {
            // For temp_images, use API URL directly (e.g., https://api.brakebee.com/temp_images/...)
            if (imageUrl.startsWith('/temp_images/')) {
              imageUrl = getApiUrl(imageUrl.substring(1)); // Remove leading slash
            } else {
              imageUrl = getSmartMediaUrl(imageUrl);
            }
          }
          
          return {
            ...product,
            processedImageUrl: imageUrl
          };
        });
        
        setProducts(processedProducts);
      } catch (err) {
        console.error('Error fetching artist products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistProducts();
  }, [vendorId, currentProductId]);

  // Create extended product array for infinite scroll (just 2 copies for smooth loop)
  useEffect(() => {
    if (products.length > 0) {
      // Only create 2 copies - enough for seamless looping without performance issues
      const extended = [];
      
      for (let i = 0; i < 2; i++) {
        extended.push(...products.map((product, index) => ({
          ...product,
          uniqueKey: `${product.id}-${i}-${index}`
        })));
      }
      
      setExtendedProducts(extended);
      
      // Preload images for smooth scrolling
      products.forEach(product => {
        if (product.processedImageUrl) {
          const img = new Image();
          img.src = product.processedImageUrl;
        }
      });
    }
  }, [products]);

  // Auto-scroll animation
  useEffect(() => {
    if (extendedProducts.length === 0) return;

    const scroll = () => {
      if (isPaused) return; // Pause scrolling when hovering
      
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = 220; // 200px width + 20px gap
      const totalWidth = cardWidth * products.length;
      
      setScrollPosition(prev => {
        const newPosition = prev + 0.3; // Slower scroll speed for better viewing
        
        // Reset when we've scrolled one full cycle
        if (newPosition >= totalWidth) {
          return 0;
        }
        
        return newPosition;
      });
    };

    animationRef.current = setInterval(scroll, 32); // ~30fps - smoother, less CPU

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [extendedProducts, products.length, isPaused]);

  // Apply scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.style.transform = `translateX(-${scrollPosition}px)`;
    }
  }, [scrollPosition]);

  const getImageUrl = (product) => {
    // Use pre-processed image URL
    return product.processedImageUrl || null;
  };

  if (loading) {
    return (
      <div className={styles.carousel}>
        <h2 className={styles.title}>More from {artistName || 'this artist'}</h2>
        <div className={styles.loading}>Loading more artwork...</div>
      </div>
    );
  }

  if (error || products.length === 0) {
    return null; // Don't show the carousel if there are no other products
  }

  return (
    <div className={styles.carousel}>
      <h2 className={styles.title}>More from {artistName || 'this artist'}</h2>
      
      <div 
        className={styles.scrollContainer}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={styles.productGrid} ref={scrollContainerRef}>
          {extendedProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.uniqueKey} className={styles.productCard}>
              <div className={styles.imageContainer}>
                {getImageUrl(product) ? (
                  <img 
                    src={getImageUrl(product)} 
                    alt={product.name}
                    className={styles.productImage}
                  />
                ) : (
                  <div className={styles.noImage}>
                    <i className="fas fa-image"></i>
                  </div>
                )}
                
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>
                    ${parseFloat(product.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtistProductCarousel; 
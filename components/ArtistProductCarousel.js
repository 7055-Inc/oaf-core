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
        const res = await fetch(getApiUrl(`products?vendor_id=${vendorId}&include=images&status=active`));
        
        if (!res.ok) {
          throw new Error('Failed to fetch artist products');
        }
        
        const data = await res.json();
        
        // Filter out the current product and any drafts
        const otherProducts = data.filter(product => 
          product.id !== currentProductId && 
          product.status === 'active' &&
          product.name && 
          product.name.toLowerCase() !== 'new product draft'
        );
        
        // Ensure image URLs are absolute
        const processedProducts = otherProducts.map(product => ({
          ...product,
          images: product.images?.map(img => {
            const imageUrl = typeof img === 'string' ? img : img.url;
            if (imageUrl.startsWith('http')) return imageUrl;
            return getSmartMediaUrl(imageUrl);
          }) || []
        }));
        
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

  // Create extended product array for infinite scroll
  useEffect(() => {
    if (products.length > 0) {
      // Create multiple copies for seamless infinite scroll
      // Calculate how many copies we need for smooth infinite scroll
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const cardWidth = 220; // 200px + 20px gap
      const visibleCards = Math.ceil(viewportWidth / cardWidth) + 2; // +2 for buffer
      const multiplier = Math.max(4, Math.ceil(visibleCards * 2 / products.length)); // At least 4 copies
      
      const extended = [];
      
      for (let i = 0; i < multiplier; i++) {
        extended.push(...products.map((product, index) => ({
          ...product,
          uniqueKey: `${product.id}-${i}-${index}`
        })));
      }
      
      setExtendedProducts(extended);
      
      // Preload images for smooth scrolling
      const preloadImages = () => {
        products.forEach(product => {
          const imageUrl = getImageUrl(product);
          if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
          }
        });
      };
      
      // Delay preloading to not block initial render
      setTimeout(preloadImages, 100);
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

    animationRef.current = setInterval(scroll, 16); // ~60fps

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
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // Handle new format: {url, is_primary} or old format: string
      return typeof image === 'string' ? image : image.url;
    }
    return null;
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
                    🎨
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
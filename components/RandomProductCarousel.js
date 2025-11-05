import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import WholesalePricing from './WholesalePricing';
import { isWholesaleCustomer } from '../lib/userUtils';
import { getAuthToken } from '../lib/csrf';
import { getApiUrl, getSmartMediaUrl } from '../lib/config';
import styles from './RandomProductCarousel.module.css';

const RandomProductCarousel = ({ title = "Discover Amazing Artwork", limit = 12, vendorId = null, products: passedProducts = null }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extendedProducts, setExtendedProducts] = useState([]);
  const scrollContainerRef = useRef(null);
  const animationRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userData, setUserData] = useState(null);

  // Get user data for wholesale pricing
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserData(payload);
      } catch (error) {
        console.error('Error parsing user token:', error);
      }
    }
  }, []);

  useEffect(() => {
    // If products are passed in, use them directly
    if (passedProducts) {
      setLoading(true);
      // Shuffle and select random products from passed data
      const shuffled = [...passedProducts].sort(() => Math.random() - 0.5).slice(0, limit);
      setProducts(shuffled);
      setLoading(false);
      return;
    }

    // Otherwise, fetch products from API
    const fetchRandomProducts = async () => {
      try {
        setLoading(true);
        // Build API URL with optional vendor filter
        const apiUrl = vendorId 
          ? getApiUrl(`products/all?include=images&vendor_id=${vendorId}`)
          : getApiUrl('products/all?include=images');
        
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await res.json();
        
        // Shuffle and select random products
        const shuffled = data.products ? 
          [...data.products].sort(() => Math.random() - 0.5).slice(0, limit) :
          [...data].sort(() => Math.random() - 0.5).slice(0, limit);
        
        setProducts(shuffled);
      } catch (err) {
        console.error('Error fetching random products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomProducts();
  }, [limit, vendorId, passedProducts]);

  // Create extended product array for infinite scroll
  useEffect(() => {
    if (products.length > 0) {
      // Create multiple copies for seamless infinite scroll
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
    // Check for image_url first (this is the main product image field)
    if (product.image_url) {
      if (product.image_url.startsWith('http')) return product.image_url;
      return getSmartMediaUrl(`/api/media/serve/${product.image_url}`);
    }
    // Check for images array as fallback
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // Handle new format: {url, is_primary} or old format: string
      const img = typeof image === 'string' ? image : image.url;
      if (img.startsWith('http')) return img;
      return getSmartMediaUrl(`/api/media/serve/${img}`);
    }
    return null;
  };

  if (loading) {
    return (
      <div className={styles.carousel}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading amazing artwork...</span>
        </div>
      </div>
    );
  }

  if (error || products.length === 0) {
    return null; // Don't show the carousel if there are no products
  }

  return (
    <div className={styles.carousel}>
      <h2 className={styles.title}>{title}</h2>
      
      <div 
        className={styles.scrollContainer}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={styles.productGrid} ref={scrollContainerRef}>
          {extendedProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.uniqueKey} className={styles.productCard}>
              <div className={styles.imageContainer}>
                <img 
                  src={getImageUrl(product)} 
                  alt={product.name || product.title}
                  className={styles.productImage}

                />
                
                                              <div className={styles.productInfo}>
                                <h3 className={styles.productName}>{product.name || product.title}</h3>
                                <WholesalePricing
                                  price={product.price}
                                  wholesalePrice={product.wholesale_price}
                                  isWholesaleCustomer={isWholesaleCustomer(userData)}
                                  size="small"
                                  layout="stacked"
                                />
                              </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RandomProductCarousel;

/**
 * ArtistProductCarousel
 * Auto-scrolling carousel showing other products from the same artist
 * 
 * Used on product detail pages to showcase more work from the vendor
 * API: GET /api/v2/catalog/public/products?vendor_id=X
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

export default function ArtistProductCarousel({ vendorId, currentProductId, artistName }) {
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
        // Use v2 public products endpoint
        const res = await fetch(getApiUrl(`api/v2/catalog/public/products?vendor_id=${vendorId}&limit=12`));
        
        if (!res.ok) {
          throw new Error('Failed to fetch artist products');
        }
        
        const data = await res.json();
        const productsArray = data.data?.products || data.products || [];
        
        // Filter out current product, drafts, and variants
        const otherProducts = productsArray.filter(product => 
          product.id !== currentProductId && 
          product.status === 'active' &&
          product.name && 
          product.name.toLowerCase() !== 'new product draft' &&
          !product.parent_id
        ).slice(0, 12);
        
        // Process image URLs
        const processedProducts = otherProducts.map(product => {
          let imageUrl = null;
          
          if (product.images && product.images.length > 0) {
            const firstImg = product.images[0];
            imageUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
          }
          
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/temp_images/')) {
              imageUrl = getApiUrl(imageUrl.substring(1));
            } else {
              imageUrl = getSmartMediaUrl(imageUrl);
            }
          }
          
          return { ...product, processedImageUrl: imageUrl };
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

  // Create extended array for infinite scroll
  useEffect(() => {
    if (products.length > 0) {
      const extended = [];
      for (let i = 0; i < 2; i++) {
        extended.push(...products.map((product, index) => ({
          ...product,
          uniqueKey: `${product.id}-${i}-${index}`
        })));
      }
      setExtendedProducts(extended);
      
      // Preload images
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
      if (isPaused) return;
      
      const cardWidth = 220;
      const totalWidth = cardWidth * products.length;
      
      setScrollPosition(prev => {
        const newPosition = prev + 0.3;
        if (newPosition >= totalWidth) return 0;
        return newPosition;
      });
    };

    animationRef.current = setInterval(scroll, 32);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [extendedProducts, products.length, isPaused]);

  // Apply scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.style.transform = `translateX(-${scrollPosition}px)`;
    }
  }, [scrollPosition]);

  if (loading) {
    return (
      <div className="artist-carousel">
        <h2 className="artist-carousel-title">More from {artistName || 'this artist'}</h2>
        <div className="loading-state">Loading more artwork...</div>
      </div>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <div className="artist-carousel">
      <h2 className="artist-carousel-title">More from {artistName || 'this artist'}</h2>
      
      <div 
        className="carousel-scroll-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="carousel-track" ref={scrollContainerRef}>
          {extendedProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.uniqueKey} className="carousel-card">
              <div className="carousel-card-image">
                {product.processedImageUrl ? (
                  <img 
                    src={product.processedImageUrl} 
                    alt={product.name}
                  />
                ) : (
                  <div className="carousel-card-placeholder">
                    <i className="fas fa-image"></i>
                  </div>
                )}
                
                <div className="carousel-card-info">
                  <h3>{product.name}</h3>
                  <div className="carousel-card-price">
                    ${parseFloat(product.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .artist-carousel {
          width: 100%;
          margin: 2rem 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .artist-carousel-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1.5rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #3e1c56;
        }

        .carousel-scroll-container {
          overflow: hidden;
          position: relative;
          height: 220px;
        }

        .carousel-track {
          display: flex;
          gap: 20px;
          width: max-content;
          transition: transform 0.016s linear;
        }

        .artist-carousel :global(.carousel-card) {
          display: block;
          width: 200px;
          height: 200px;
          min-width: 200px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          overflow: hidden;
          transition: all 0.2s ease-in-out;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        .artist-carousel :global(.carousel-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #3e1c56;
        }

        .carousel-card-image {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #f8fafc;
        }

        .carousel-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease-in-out;
        }

        .artist-carousel :global(.carousel-card:hover) .carousel-card-image img {
          transform: scale(1.05);
        }

        .carousel-card-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: #f3f4f6;
          color: #9ca3af;
          font-size: 2rem;
        }

        .carousel-card-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 33.33%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.25rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          transition: background-color 0.2s ease-in-out;
        }

        .artist-carousel :global(.carousel-card:hover) .carousel-card-info {
          background: rgba(255, 255, 255, 0.95);
        }

        .carousel-card-info h3 {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          line-height: 1.2;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .carousel-card-price {
          font-size: 1rem;
          font-weight: 600;
          color: #059669;
          margin: 0;
        }

        @media (max-width: 768px) {
          .artist-carousel {
            margin: 1rem 0;
            padding: 1rem;
          }
          
          .artist-carousel-title {
            font-size: 1.25rem;
            margin-bottom: 1rem;
          }
          
          .carousel-scroll-container {
            height: 180px;
          }
          
          .artist-carousel :global(.carousel-card) {
            width: 160px;
            height: 160px;
            min-width: 160px;
          }
          
          .carousel-card-info {
            padding: 0.5rem;
          }
          
          .carousel-card-info h3 {
            font-size: 0.8rem;
          }
          
          .carousel-card-price {
            font-size: 0.9rem;
          }
          
          .carousel-track {
            gap: 15px;
          }
        }

        @media (max-width: 480px) {
          .carousel-scroll-container {
            height: 160px;
          }
          
          .artist-carousel :global(.carousel-card) {
            width: 140px;
            height: 140px;
            min-width: 140px;
          }
          
          .carousel-track {
            gap: 12px;
          }
          
          .carousel-card-info {
            padding: 0.4rem;
          }
          
          .carousel-card-info h3 {
            font-size: 0.75rem;
            -webkit-line-clamp: 1;
          }
          
          .carousel-card-price {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}

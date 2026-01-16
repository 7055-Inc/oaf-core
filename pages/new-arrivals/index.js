'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './NewArrivals.module.css';
import { getApiUrl, getSmartMediaUrl } from '../../lib/config';

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNewArrivals();
  }, []);

  const loadNewArrivals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch newest products - limit 25, parent/simple products only
      const response = await fetch(getApiUrl('products?limit=25&sort=newest&parent_only=true'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      
    } catch (err) {
      console.error('Error loading new arrivals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className={styles.pageContainer}>
      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h1 className={styles.pageTitle}>New Arrivals</h1>
          <p className={styles.pageSubtitle}>
            Discover the latest handcrafted pieces from our talented artists
          </p>
        </section>

        <section className={styles.productsSection}>
          <div className={styles.container}>
            
            {error && (
              <div className={styles.errorMessage}>
                <p>Error loading products: {error}</p>
                <button 
                  onClick={loadNewArrivals}
                  className={styles.retryButton}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
              <div className={styles.productsGrid}>
                {[...Array(8)].map((_, index) => (
                  <div key={`skeleton-${index}`} className={styles.skeletonCard}>
                    <div className={styles.skeletonImage}></div>
                    <div className={styles.skeletonContent}>
                      <div className={styles.skeletonTitle}></div>
                      <div className={styles.skeletonText}></div>
                      <div className={styles.skeletonPrice}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!isLoading && products.length > 0 && (
              <div className={styles.productsGrid}>
                {products.map(product => (
                  <Link 
                    href={`/products/${product.id}`} 
                    key={product.id}
                    className={styles.productCard}
                  >
                    <div className={styles.imageWrapper}>
                      {product.primary_image ? (
                        <Image
                          src={getSmartMediaUrl(product.primary_image)}
                          alt={product.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.placeholderImage}>
                          <span>No Image</span>
                        </div>
                      )}
                      <span className={styles.newBadge}>New</span>
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productTitle}>{product.title}</h3>
                      {product.artist_name && (
                        <p className={styles.artistName}>by {product.artist_name}</p>
                      )}
                      <p className={styles.productPrice}>
                        {product.price ? formatPrice(product.price) : 'Price on request'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && products.length === 0 && !error && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎨</div>
                <h3>No Products Yet</h3>
                <p>New arrivals will appear here soon. Check back later!</p>
                <Link href="/collections" className={styles.browseLink}>
                  Browse Collections
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

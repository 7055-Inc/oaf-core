import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/config';
import { SearchBar } from '../components/search';
import RandomProductCarousel from '../components/RandomProductCarousel';
import styles from '../styles/404.module.css';

const Custom404 = () => {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [popularCategories, setPopularCategories] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch some helpful data for navigation
    const fetchHelpfulData = async () => {
      try {
        // Fetch popular categories
        const categoriesRes = await fetch(getApiUrl('categories?limit=6'));
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setPopularCategories(categoriesData.categories || []);
        }

        // Fetch recent products
        const productsRes = await fetch('products?limit=4&sort=created_at');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setRecentProducts(productsData.products || []);
        }
      } catch (error) {
        console.log('Error fetching helpful data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpfulData();
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/static_media/placeholder-product.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    return `api/media/serve/${imagePath}`;
  };

  return (
    <>
      <Head>
        <title>Page Not Found - Online Art Festival</title>
        <meta name="description" content="The page you're looking for doesn't exist. Explore our art collection, events, and artist galleries instead." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className={styles.container}>
        <div className={styles.heroSection}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              <span className={styles.errorNumber}>404</span>
              <div className={styles.artBrush}>🎨</div>
            </div>
            
            <h1 className={styles.title}>Oops! This Page Went Missing</h1>
            <p className={styles.subtitle}>
              The page you're looking for might have been moved, deleted, or doesn't exist. 
              But don't worry - there's plenty of amazing art to discover!
            </p>

            <div className={styles.actionButtons}>
              <button 
                onClick={handleGoBack}
                className={`${styles.button} ${styles.primaryButton}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Go Back
              </button>
              
              <Link href="/" className={`${styles.button} ${styles.secondaryButton}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Home
              </Link>
              
              <button 
                onClick={() => setShowSearch(true)}
                className={`${styles.button} ${styles.tertiaryButton}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Product Carousel - Full Width */}
        <div className={styles.productCarouselSection}>
          <RandomProductCarousel title="Or browse some amazing artwork while you're here" limit={16} />
        </div>

        <div className={styles.helpfulSection}>
          <div className={styles.sectionGrid}>
            {/* Popular Categories */}
            {popularCategories.length > 0 && (
              <div className={styles.helpSection}>
                <h2 className={styles.sectionTitle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Popular Categories
                </h2>
                <div className={styles.categoryGrid}>
                  {popularCategories.map((category) => (
                    <Link 
                      key={category.id} 
                      href={`/category/${category.id}`}
                      className={styles.categoryCard}
                    >
                      <span className={styles.categoryName}>{category.name}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Products */}
            {recentProducts.length > 0 && (
              <div className={styles.helpSection}>
                <h2 className={styles.sectionTitle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Recent Artworks
                </h2>
                <div className={styles.productGrid}>
                  {recentProducts.map((product) => (
                    <Link 
                      key={product.id} 
                      href={`/products/${product.id}`}
                      className={styles.productCard}
                    >
                      <div className={styles.productImage}>
                        <img 
                          src={getImageUrl(product.image_url)} 
                          alt={product.title}
                          onError={(e) => {
                            e.target.src = '/static_media/placeholder-product.jpg';
                          }}
                        />
                      </div>
                      <div className={styles.productInfo}>
                        <h3 className={styles.productTitle}>{product.title}</h3>
                        <p className={styles.productPrice}>
                          ${parseFloat(product.price || 0).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className={styles.helpSection}>
              <h2 className={styles.sectionTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Quick Links
              </h2>
              <div className={styles.quickLinks}>
                <Link href="/events" className={styles.quickLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Events
                </Link>
                <Link href="/articles" className={styles.quickLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  Articles
                </Link>
                <Link href="/dashboard" className={styles.quickLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  Dashboard
                </Link>
                <Link href="/login" className={styles.quickLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className={styles.loadingSection}>
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
              <p>Loading helpful suggestions...</p>
            </div>
          </div>
        )}
      </main>

      {/* Search Modal */}
      {showSearch && (
        <SearchBar 
          placeholder="Search for art, events, artists..." 
          autoFocus={true}
          showModal={true}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  );
};

export default Custom404;

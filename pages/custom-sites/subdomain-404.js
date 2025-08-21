import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import RandomProductCarousel from '../../components/RandomProductCarousel';
import styles from '../../styles/subdomain-404.module.css';

const SubdomainCustom404 = () => {
  const router = useRouter();
  const { subdomain, hostname, isCustomDomain } = router.query;
  const [siteData, setSiteData] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (subdomain) {
      fetchSiteData();
    }
  }, [subdomain]);

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      
      // Fetch site data to get vendor info and brand colors
      const siteRes = await fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`);
      if (!siteRes.ok) {
        throw new Error('Site not found');
      }
      
      const siteData = await siteRes.json();
      setSiteData(siteData);
      
      // Fetch products for this vendor
      const productsRes = await fetch(`https://api2.onlineartfestival.com/products/all?include=images&vendor_id=${siteData.user_id}`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = productsData.products || productsData || [];
        setVendorProducts(products);
      }
      
    } catch (err) {
      console.error('Error fetching site data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      // Go to site homepage - use custom domain if available
      const siteUrl = isCustomDomain === 'true' && hostname 
        ? `https://${hostname}`
        : `https://${subdomain}.onlineartfestival.com`;
      window.location.href = siteUrl;
    }
  };

  const getSiteUrl = () => {
    return isCustomDomain === 'true' && hostname 
      ? `https://${hostname}`
      : `https://${subdomain}.onlineartfestival.com`;
  };

  const getCustomStyles = () => {
    if (!siteData) return {};
    
    return {
      '--site-primary-color': siteData.primary_color,
      '--site-secondary-color': siteData.secondary_color,
    };
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading site...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className={styles.errorContainer}>
        <h1>Site Not Found</h1>
        <p>The site "{subdomain}" could not be found.</p>
        <Link href="https://main.onlineartfestival.com">
          <a className={styles.homeLink}>Visit Main Site</a>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Page Not Found - {siteData.site_name || (isCustomDomain === 'true' ? hostname : subdomain)}</title>
        <meta name="description" content={`The page you're looking for doesn't exist on ${siteData.site_name || (isCustomDomain === 'true' ? hostname : subdomain)}'s gallery. Explore their artwork instead.`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className={styles.container} style={getCustomStyles()}>
        <div className={styles.heroSection}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              <span className={styles.errorNumber}>404</span>
              <div className={styles.artBrush}>🎨</div>
            </div>
            
            <h1 className={styles.title}>Oops! This Page Went Missing</h1>
            <p className={styles.subtitle}>
              The page you're looking for doesn't exist in {siteData.site_name || (isCustomDomain === 'true' ? hostname : subdomain)}'s gallery.
              {vendorProducts.length > 0 ? " But check out their amazing artwork below!" : " Explore their other pages instead."}
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
              
              <Link href={getSiteUrl()}>
                <a className={`${styles.button} ${styles.secondaryButton}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                  Gallery Home
                </a>
              </Link>
              
              <Link href="https://main.onlineartfestival.com">
                <a className={`${styles.button} ${styles.tertiaryButton}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Main Site
                </a>
              </Link>
            </div>
          </div>
        </div>

        {/* Product Carousel - Only show if vendor has products */}
        {vendorProducts.length > 0 && (
          <div className={styles.productCarouselSection}>
            <RandomProductCarousel 
              title={`Explore ${siteData.site_name || subdomain}'s Artwork`}
              products={vendorProducts}
              limit={Math.min(vendorProducts.length, 16)}
            />
          </div>
        )}

        {/* Site Info Section */}
        <div className={styles.siteInfoSection}>
          <div className={styles.siteInfo}>
            <h2 className={styles.siteTitle}>{siteData.site_name || (isCustomDomain === 'true' ? hostname : subdomain)}</h2>
            {siteData.site_description && (
              <p className={styles.siteDescription}>{siteData.site_description}</p>
            )}
            
            <div className={styles.siteLinks}>
              <Link href={getSiteUrl()}>
                <a className={styles.siteLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                  Visit Gallery
                </a>
              </Link>
              
              <Link href={`${getSiteUrl()}/about`}>
                <a className={styles.siteLink}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  About Artist
                </a>
              </Link>
              
              {vendorProducts.length > 0 && (
                <Link href={`${getSiteUrl()}/products`}>
                  <a className={styles.siteLink}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    View Artwork ({vendorProducts.length})
                  </a>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default SubdomainCustom404;

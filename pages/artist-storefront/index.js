import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ArtistStorefront.module.css';

const ArtistStorefront = () => {
  const router = useRouter();
  const { subdomain, userId, siteName, themeName } = router.query;
  
  const [siteData, setSiteData] = useState(null);
  const [products, setProducts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (subdomain) {
      fetchStorefrontData();
    }
  }, [subdomain]);

  const fetchStorefrontData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [siteResponse, productsResponse, articlesResponse, categoriesResponse] = await Promise.all([
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`),
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/products?limit=12`),
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/articles?type=menu`),
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}/categories`)
      ]);

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        setSiteData(siteData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        setArticles(articlesData);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

    } catch (err) {
      setError('Failed to load storefront data');
      console.error('Error fetching storefront data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId) => {
    try {
      // Find the product details
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        return;
      }

      // Get authentication token (if user is logged in)
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      
      // Generate guest token if no auth token
      let guestToken = null;
      if (!token) {
        guestToken = localStorage.getItem('guestToken');
        if (!guestToken) {
          guestToken = 'guest_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
          localStorage.setItem('guestToken', guestToken);
        }
      }

      // Prepare API request
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = {
        product_id: product.id,
        vendor_id: product.vendor_id || siteData.user_id,
        quantity: 1,
        price: product.price,
        source_site_api_key: subdomain, // Use subdomain as site identifier
        source_site_name: siteData.site_name || `${siteData.first_name} ${siteData.last_name}`,
        ...(guestToken && { guest_token: guestToken })
      };

      // Add to cart via enhanced API
      const response = await fetch('https://api2.onlineartfestival.com/cart/add', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 500;
        `;
        notification.textContent = `Added "${product.name}" to cart! 🛒`;
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.remove();
        }, 3000);

        console.log('Cart updated:', result);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to cart');
      }
      
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading {siteName || 'artist'} gallery...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className={styles.error}>
        <h1>Gallery Not Found</h1>
        <p>Sorry, this artist gallery is not available.</p>
        <Link href="https://main.onlineartfestival.com">
          <a className={styles.homeLink}>← Back to Main Site</a>
        </Link>
      </div>
    );
  }

  const pageTitle = siteData.site_title || `${siteData.first_name} ${siteData.last_name} - Artist Gallery`;
  const pageDescription = siteData.site_description || siteData.bio || `Discover the artistic works of ${siteData.first_name} ${siteData.last_name}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph tags for social media */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://${subdomain}.onlineartfestival.com`} />
        {siteData.profile_image_path && (
          <meta property="og:image" content={`https://api2.onlineartfestival.com${siteData.profile_image_path}`} />
        )}
      </Head>

      <div className={styles.storefront}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.artistInfo}>
              {siteData.profile_image_path && (
                <img 
                  src={`https://api2.onlineartfestival.com${siteData.profile_image_path}`}
                  alt={`${siteData.first_name} ${siteData.last_name}`}
                  className={styles.artistAvatar}
                />
              )}
              <div className={styles.artistDetails}>
                <h1 className={styles.artistName}>
                  {siteData.first_name} {siteData.last_name}
                </h1>
                <p className={styles.artistTitle}>Artist</p>
              </div>
            </div>

            <nav className={styles.navigation}>
              <Link href={`https://${subdomain}.onlineartfestival.com`}>
                <a className={styles.navLink}>Gallery</a>
              </Link>
              {articles.map(article => (
                <Link key={article.id} href={`https://${subdomain}.onlineartfestival.com/${article.slug}`}>
                  <a className={styles.navLink}>{article.title}</a>
                </Link>
              ))}
              <Link href="https://main.onlineartfestival.com">
                <a className={styles.navLink}>Main Site</a>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        {siteData.header_image_path && (
          <section className={styles.hero}>
            <img 
              src={`https://api2.onlineartfestival.com${siteData.header_image_path}`}
              alt="Artist Header"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay}>
              <h2 className={styles.heroTitle}>{siteData.site_title || 'Welcome to My Gallery'}</h2>
              {siteData.site_description && (
                <p className={styles.heroDescription}>{siteData.site_description}</p>
              )}
            </div>
          </section>
        )}

        {/* About Section */}
        {siteData.bio && (
          <section className={styles.about}>
            <div className={styles.container}>
              <h2>About the Artist</h2>
              <p className={styles.bio}>{siteData.bio}</p>
            </div>
          </section>
        )}

        {/* Categories Filter */}
        {categories.length > 0 && (
          <section className={styles.categories}>
            <div className={styles.container}>
              <h3>Browse by Category</h3>
              <div className={styles.categoryTags}>
                <button className={styles.categoryTag}>All</button>
                {categories.map(category => (
                  <button key={category.id} className={styles.categoryTag}>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Products Gallery */}
        <section className={styles.gallery}>
          <div className={styles.container}>
            <h2>Gallery</h2>
            
            {products.length === 0 ? (
              <div className={styles.emptyGallery}>
                <p>No artworks available at the moment.</p>
                <p>Please check back soon for new pieces!</p>
              </div>
            ) : (
              <div className={styles.productsGrid}>
                {products.map(product => (
                  <div key={product.id} className={styles.productCard}>
                    <div className={styles.productImage}>
                      {product.image_path ? (
                        <img 
                          src={`https://api2.onlineartfestival.com${product.image_path}`}
                          alt={product.alt_text || product.name}
                        />
                      ) : (
                        <div className={styles.placeholderImage}>
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productPrice}>${product.price}</p>
                      
                      {product.description && (
                        <p className={styles.productDescription}>
                          {product.description.substring(0, 100)}
                          {product.description.length > 100 && '...'}
                        </p>
                      )}
                      
                      <div className={styles.productActions}>
                        <button 
                          className={styles.addToCartBtn}
                          onClick={() => addToCart(product.id)}
                        >
                          Add to Cart
                        </button>
                        <Link href={`https://${subdomain}.onlineartfestival.com/product/${product.id}`}>
                          <a className={styles.viewProductBtn}>View Details</a>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {products.length >= 12 && (
              <div className={styles.viewMore}>
                <Link href={`https://${subdomain}.onlineartfestival.com/products`}>
                  <a className={styles.viewMoreBtn}>View All Artworks</a>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerContent}>
              <div className={styles.footerSection}>
                <h4>{siteData.first_name} {siteData.last_name}</h4>
                <p>Artist Gallery</p>
                {siteData.website && (
                  <p>
                    <a href={siteData.website} target="_blank" rel="noopener noreferrer">
                      Visit Artist Website
                    </a>
                  </p>
                )}
              </div>
              
              <div className={styles.footerSection}>
                <h4>Social Media</h4>
                <div className={styles.socialLinks}>
                  {siteData.social_instagram && (
                    <a href={siteData.social_instagram} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  )}
                  {siteData.social_facebook && (
                    <a href={siteData.social_facebook} target="_blank" rel="noopener noreferrer">
                      Facebook
                    </a>
                  )}
                  {siteData.social_twitter && (
                    <a href={siteData.social_twitter} target="_blank" rel="noopener noreferrer">
                      Twitter
                    </a>
                  )}
                </div>
              </div>
              
              <div className={styles.footerSection}>
                <h4>Platform</h4>
                <p>
                  <Link href="https://main.onlineartfestival.com">
                    <a>Online Art Festival</a>
                  </Link>
                </p>
                <p className={styles.poweredBy}>Powered by OAF</p>
              </div>
            </div>
            
            <div className={styles.footerBottom}>
              <p>&copy; 2025 {siteData.first_name} {siteData.last_name}. All rights reserved.</p>
              <p>Gallery hosted by Online Art Festival</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ArtistStorefront; 
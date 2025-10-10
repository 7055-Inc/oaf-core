import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import WholesalePricing from '../../components/WholesalePricing';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { getFrontendUrl } from '../../lib/config';
import styles from './ArtistStorefront.module.css';

const ArtistStorefront = () => {
  const router = useRouter();
  const { subdomain, userId, siteName, themeName } = router.query;
  
  const [siteData, setSiteData] = useState(null);
  const [products, setProducts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extractedSubdomain, setExtractedSubdomain] = useState(null);
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
    // Extract subdomain from the current URL if query params aren't available
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('.beemeeart.com') && hostname !== 'main.beemeeart.com') {
        const subdomainFromUrl = hostname.split('.')[0];
        setExtractedSubdomain(subdomainFromUrl);
      }
    }
  }, []);

  useEffect(() => {
    const subdomainToUse = subdomain || extractedSubdomain;
    if (subdomainToUse) {
      fetchStorefrontData(subdomainToUse);
    }
  }, [subdomain, extractedSubdomain]);

  const fetchStorefrontData = async (subdomainToUse) => {
    try {
      setLoading(true);
      
      // First fetch site data to get user_id
      const siteResponse = await fetch(`${config.API_BASE_URL}/api/sites/resolve/${subdomainToUse}`);
      let siteData = null;
      
      if (siteResponse.ok) {
        siteData = await siteResponse.json();
      }
      
      if (!siteData || !siteData.user_id) {
        throw new Error('Site not found or missing user data');
      }
      
      // Fetch all data in parallel including full profile
      const [profileResponse, productsResponse, articlesResponse, pagesResponse, categoriesResponse] = await Promise.all([
        fetch(`${config.API_BASE_URL}/users/profile/by-id/${siteData.user_id}`),
        fetch(`${config.API_BASE_URL}/products/all?vendor_id=${siteData.user_id}&include=images&limit=12`),
        fetch(`${config.API_BASE_URL}/api/sites/resolve/${subdomainToUse}/articles?type=menu`),
        fetch(`${config.API_BASE_URL}/api/sites/resolve/${subdomainToUse}/articles?type=pages`),
        fetch(`${config.API_BASE_URL}/api/sites/resolve/${subdomainToUse}/categories`)
      ]);

      // Merge site data with full profile data
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        // Combine site settings with complete profile data
        const combinedData = { ...siteData, ...profileData };
        setSiteData(combinedData);
      } else {
        // Fallback to just site data if profile fetch fails
        setSiteData(siteData);
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        // Handle both response formats: direct array or {products: [...]}
        const productsArray = productsData.products || productsData;
        // Limit to 12 products on frontend since /products/all doesn't support limit
        setProducts(Array.isArray(productsArray) ? productsArray.slice(0, 12) : []);
      }

      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        setArticles(articlesData);
      }

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setPages(pagesData);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

      // Load addons after all data is fetched
      if (siteData) {
        loadSiteAddons(siteData.id);
      }

    } catch (err) {
      setError('Failed to load storefront data');
      console.error('Error fetching storefront data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple addon trigger - loads and initializes active addons
  const loadSiteAddons = async (siteId) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/sites/${siteId}/addons`);
      if (response.ok) {
        const data = await response.json();
        const addons = data.addons || [];
        
        // Load each active addon
        for (const addon of addons) {
          if (addon.is_active) {
            loadAddon(addon, siteId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading addons:', error);
    }
  };

  // Load individual addon script and initialize
  const loadAddon = async (addon, siteId) => {
    try {
      // Dynamically import the addon module
      const addonModule = await import(`../../components/sites-modules/${addon.addon_slug}.js`);
      const AddonClass = addonModule.default;
      
      // Initialize the addon with site configuration
      const addonInstance = new AddonClass({
        siteId,
        siteData,
        addonConfig: addon
      });
      
      // Initialize the addon
      addonInstance.init();
      
      console.log(`Addon loaded: ${addon.addon_name}`);
    } catch (error) {
      console.error(`Error loading addon ${addon.addon_name}:`, error);
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
      const response = await fetch(`${config.API_BASE_URL}/cart/add`, {
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

        // Cart updated
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to cart');
      }
      
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart: ' + err.message);
    }
  };

  // Apply custom site colors as CSS variables
  const getCustomStyles = () => {
    if (!siteData) return {};
    
    return {
      '--text-color': siteData.text_color,
      '--main-color': siteData.primary_color,
      '--secondary-color': siteData.secondary_color,
      '--accent-color': siteData.accent_color,
      '--background-color': siteData.background_color,
    };
  };

  // Image URL helper function (same logic as RandomProductCarousel)
  const getImageUrl = (product) => {
    // Check for image_url first (this is the main product image field)
    if (product.image_url) {
      if (product.image_url.startsWith('http')) return product.image_url;
      return `${config.API_BASE_URL}/api/media/serve/${product.image_url}`;
    }
    // Check for image_path (legacy field)
    if (product.image_path) {
      if (product.image_path.startsWith('http')) return product.image_path;
      return `${config.API_BASE_URL}/api/media/serve/${product.image_path}`;
    }
    // Check for images array (from the include=images parameter)
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      if (img.startsWith('http')) return img;
      return `${config.API_BASE_URL}/api/media/serve/${img}`;
    }
    return null; // No image available
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
        <Link href="https://main.beemeeart.com">
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
        <meta property="og:url" content={`https://${subdomain}.beemeeart.com`} />
        {siteData.profile_image_path && (
          <meta property="og:image" content={siteData.profile_image_path} />
        )}
      </Head>

      <div className={styles.storefront} style={getCustomStyles()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.artistInfo}>
              {siteData.logo_path && (
                <img 
                  src={siteData.logo_path}
                  alt={`${siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`} Logo`}
                  className={styles.artistAvatar}
                />
              )}
              <div className={styles.artistDetails}>
                <h1 className={styles.artistName}>
                  {siteData.display_name || `${siteData.first_name} ${siteData.last_name}`}
                </h1>
                <div className={styles.artistMeta}>
                  <p className={styles.artistTitle}>
                    {siteData.job_title || (siteData.business_name ? `${siteData.business_name} - Artist` : 'Artist')}
                  </p>
                  {(siteData.city || siteData.state || siteData.country) && (
                    <p className={styles.artistLocation}>
                      {[siteData.city, siteData.state, siteData.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              {/* Business name for header display */}
              <div className={styles.businessName}>
                {siteData.business_name && (
                  <h2 className={styles.businessNameText}>{siteData.business_name}</h2>
                )}
              </div>
            </div>

            <nav className={styles.navigation}>
              <Link href={siteData.custom_domain ? `https://${siteData.custom_domain}` : `https://${subdomain}.beemeeart.com`}>
                <a className={styles.navLink}>Home</a>
              </Link>
              {articles.map(article => (
                <Link key={article.id} href={`${siteData.custom_domain ? `https://${siteData.custom_domain}` : `https://${subdomain}.beemeeart.com`}/${article.slug}`}>
                  <a className={styles.navLink}>{article.title}</a>
                </Link>
              ))}
              {pages.find(page => page.page_type === 'contact') && (
                <Link href={`${siteData.custom_domain ? `https://${siteData.custom_domain}` : `https://${subdomain}.beemeeart.com`}/${pages.find(page => page.page_type === 'contact').slug}`}>
                  <a className={styles.navLink}>{pages.find(page => page.page_type === 'contact').title}</a>
                </Link>
              )}
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        {siteData.header_image_path && (
          <section className={styles.hero}>
            <img 
              src={siteData.header_image_path}
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
        {(siteData.bio || siteData.artist_biography) && (
          <section className={styles.about}>
            <div className={styles.container}>
              <h2>About the Artist</h2>
              
              {/* Artist profile layout with image and bio */}
              <div className={styles.artistProfile}>
                {/* Profile image on the left */}
                <div className={styles.profileImageContainer}>
                  <img 
                    src={siteData.profile_image_path || '/images/default-avatar.png'} 
                    alt={`${siteData.first_name} ${siteData.last_name}`}
                    className={styles.profileImage}
                  />
                  {/* Studio Location below image */}
                  {(siteData.studio_city || siteData.studio_state) && (
                    <div className={styles.studioLocation}>
                      {siteData.studio_city && siteData.studio_state 
                        ? `${siteData.studio_city}, ${siteData.studio_state}`
                        : siteData.studio_city || siteData.studio_state
                      }
                    </div>
                  )}
                </div>
                
                {/* Bio and details on the right */}
                <div className={styles.profileContent}>
                  {/* Primary bio/artist biography */}
                  <div className={styles.bioContent}>
                    <p className={styles.bio}>{siteData.artist_biography || siteData.bio}</p>
                  </div>
                  
                  {/* Artist details grid */}
                  <div className={styles.artistDetails}>
                    {/* Art Categories */}
                    {siteData.art_categories && siteData.art_categories.length > 0 && (
                      <div className={styles.detailItem}>
                        <h4>Art Categories</h4>
                        <div className={styles.tagList}>
                          {siteData.art_categories.map((category, index) => (
                            <span key={index} className={styles.tag}>{category}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Art Mediums */}
                    {siteData.art_mediums && siteData.art_mediums.length > 0 && (
                      <div className={styles.detailItem}>
                        <h4>Mediums</h4>
                        <div className={styles.tagList}>
                          {siteData.art_mediums.map((medium, index) => (
                            <span key={index} className={styles.tag}>{medium}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    

                    {/* Founding Date */}
                    {siteData.founding_date && (
                      <div className={styles.detailItem}>
                        <h4>Artistic Journey Started</h4>
                        <p>{new Date(siteData.founding_date).getFullYear()}</p>
                      </div>
                    )}
                    
                    {/* Custom Work */}
                    {siteData.does_custom === 'yes' && (
                      <div className={styles.detailItem}>
                        <h4>Custom Commissions</h4>
                        <p>{siteData.custom_details || 'Available for custom work'}</p>
                      </div>
                    )}
                    
                    {/* Awards */}
                    {siteData.awards && (
                      <div className={styles.detailItem}>
                        <h4>Awards & Recognition</h4>
                        <p>{siteData.awards}</p>
                      </div>
                    )}
                    
                    {/* Memberships */}
                    {siteData.memberships && (
                      <div className={styles.detailItem}>
                        <h4>Professional Memberships</h4>
                        <p>{siteData.memberships}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                      {getImageUrl(product) ? (
                        <img 
                          src={getImageUrl(product)}
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
                      <WholesalePricing
                        price={product.price}
                        wholesalePrice={product.wholesale_price}
                        isWholesaleCustomer={isWholesaleCustomer(userData)}
                        size="medium"
                        layout="inline"
                        className={styles.productPrice}
                      />
                      
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
                        <Link href={`/product/${product.id}`}>
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
                <Link href={`/products`}>
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
                <h4>Connect</h4>
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
                  {siteData.social_pinterest && (
                    <a href={siteData.social_pinterest} target="_blank" rel="noopener noreferrer">
                      Pinterest
                    </a>
                  )}
                  {siteData.social_tiktok && (
                    <a href={siteData.social_tiktok} target="_blank" rel="noopener noreferrer">
                      TikTok
                    </a>
                  )}
                </div>
                
                {/* Contact info */}
                {(siteData.phone || siteData.business_website) && (
                  <div className={styles.contactInfo}>
                    {siteData.phone && (
                      <p className={styles.phone}>{siteData.phone}</p>
                    )}
                    {siteData.business_website && (
                      <p>
                        <a href={siteData.business_website} target="_blank" rel="noopener noreferrer">
                          Business Website
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.footerBottom}>
              <p>&copy; 2025 {siteData.display_name || `${siteData.first_name} ${siteData.last_name}`}. All rights reserved.</p>
            </div>
            
            {/* Branded Footer - Hidden on higher tier plans */}
            <div className={styles.brandedFooter}>
              <div className={styles.brandedContent}>
                <span className={styles.poweredByText}>Powered by</span>
                <img 
                  src="/static_media/logo.png" 
                  alt="Online Art Festival" 
                  className={styles.brandLogo}
                />
                <a 
                  href={getFrontendUrl('/')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.brandLink}
                >
                  OnlineArtFestival.com
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ArtistStorefront; 
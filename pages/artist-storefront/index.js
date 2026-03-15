import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import WholesalePricing from '../../components/WholesalePricing';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { getFrontendUrl, getSubdomainBase, getSmartMediaUrl, config } from '../../lib/config';

const ArtistStorefront = ({
  initialSiteData,
  initialProducts,
  initialSubdomain,
  ssrError
}) => {
  const router = useRouter();
  const subdomain = initialSubdomain || router.query.subdomain;

  const [siteData] = useState(initialSiteData || null);
  const [products] = useState(initialProducts || []);
  const [error] = useState(ssrError || null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserData(payload);
      } catch (err) {
        console.error('Error parsing user token:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (siteData?.id) {
      loadSiteAddons(siteData.id);
    }
  }, [siteData?.id]);

  const loadSiteAddons = async (siteId) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v2/websites/sites/${siteId}/addons`);
      if (response.ok) {
        const data = await response.json();
        const addons = data.addons || [];
        for (const addon of addons) {
          if (addon.is_active) {
            loadAddon(addon, siteId);
          }
        }
      }
    } catch (err) {
      console.error('Error loading addons:', err);
    }
  };

  const loadAddon = async (addon, siteId) => {
    try {
      const addonModule = await import(`../../components/sites-modules/${addon.addon_slug}.js`);
      const AddonClass = addonModule.default;
      const addonInstance = new AddonClass({ siteId, siteData, addonConfig: addon });
      addonInstance.init();
    } catch (err) {
      console.error(`Error loading addon ${addon.addon_name}:`, err);
    }
  };

  const addToCart = async (productId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        return;
      }

      const token = document.cookie.split('token=')[1]?.split(';')[0];

      let guestToken = null;
      if (!token) {
        guestToken = localStorage.getItem('guestToken');
        if (!guestToken) {
          guestToken = 'guest_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
          localStorage.setItem('guestToken', guestToken);
        }
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = {
        product_id: product.id,
        vendor_id: product.vendor_id || siteData.user_id,
        quantity: 1,
        price: product.price,
        source_site_api_key: subdomain,
        source_site_name: siteData.site_name || `${siteData.first_name} ${siteData.last_name}`,
        ...(guestToken && { guest_token: guestToken })
      };

      const response = await fetch(`${config.API_BASE_URL}/api/v2/commerce/cart/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const notification = document.createElement('div');
        const cs = getComputedStyle(document.querySelector('.storefront') || document.documentElement);
        const bg = cs.getPropertyValue('--main-color').trim() || '#333';
        const fg = cs.getPropertyValue('--background-color').trim() || '#fff';
        const radius = cs.getPropertyValue('--border-radius').trim() || '8px';
        notification.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:${fg};padding:15px 20px;border-radius:${radius};box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;font-family:var(--body-font,sans-serif);`;
        notification.textContent = `Added "${product.name}" to cart!`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart: ' + err.message);
    }
  };

  const getImageUrl = (product) => {
    const resolveUrl = (val) => {
      if (!val) return null;
      if (val.startsWith('http')) return val;
      if (val.startsWith('/temp_images/')) return `${config.API_BASE_URL}${val}`;
      return getSmartMediaUrl(val);
    };
    if (product.image_url) return resolveUrl(product.image_url);
    if (product.image_path) return resolveUrl(product.image_path);
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      const img = typeof image === 'string' ? image : image.url;
      return resolveUrl(img);
    }
    return null;
  };

  if (error || !siteData) {
    return (
      <div className="error">
        <h1>Gallery Not Found</h1>
        <p>Sorry, this artist gallery is not available.</p>
        <Link href={getFrontendUrl()} className="homeLink">← Back to Main Site</Link>
      </div>
    );
  }

  const subdomainBase = getSubdomainBase();
  const siteUrl = siteData.custom_domain ? `https://${siteData.custom_domain}` : `https://${subdomain}.${subdomainBase}`;
  const pageTitle = siteData.site_title || `${siteData.first_name} ${siteData.last_name} - Artist Gallery`;
  const pageDescription = siteData.site_description || siteData.bio || `Discover the artistic works of ${siteData.first_name} ${siteData.last_name}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        {siteData.profile_image_path && (
          <meta property="og:image" content={siteData.profile_image_path} />
        )}
        <link rel="canonical" href={siteUrl} />
      </Head>

      {/* Hero Section */}
      <section className="hero-section" style={siteData.header_image_path ? { backgroundImage: `url(${siteData.header_image_path})` } : {}}>
        <h2 className="hero-title">{siteData.site_title || 'Welcome to My Gallery'}</h2>
        {siteData.site_description && (
          <p className="hero-tagline">{siteData.site_description}</p>
        )}
        <Link href="/products" className="hero-cta">View Gallery</Link>
      </section>

      {/* About Section */}
      {(siteData.bio || siteData.artist_biography) && (
        <section className="about-section">
          <p className="about-text">{siteData.artist_biography || siteData.bio}</p>
        </section>
      )}

      {/* Products Gallery */}
      <section className="product-section">
        <h2 className="section-title">Shop {siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`}</h2>

        {products.length === 0 ? (
          <p>No artworks available at the moment. Please check back soon!</p>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <Link key={product.id} href={`/product/${product.id}`} className="product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-image-wrapper">
                  {getImageUrl(product) ? (
                    <img
                      src={getImageUrl(product)}
                      alt={product.alt_text || product.name}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', minHeight: '200px' }}>
                      <span>No Image</span>
                    </div>
                  )}
                </div>

                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  <WholesalePricing
                    price={product.price}
                    wholesalePrice={product.wholesale_price}
                    isWholesaleCustomer={isWholesaleCustomer(userData)}
                    size="medium"
                    layout="inline"
                    className="product-price"
                  />

                  {product.description && (
                    <p className="product-description">
                      {product.description.substring(0, 100)}
                      {product.description.length > 100 && '...'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {products.length >= 12 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/products" className="hero-cta">View All Artworks</Link>
          </div>
        )}
      </section>
    </>
  );
};

export async function getServerSideProps(context) {
  const fs = require('fs');
  const path = require('path');
  const { subdomain } = context.query;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';

  if (!subdomain) {
    return { props: { ssrError: 'No subdomain specified' } };
  }

  try {
    const siteResponse = await fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}`);
    if (!siteResponse.ok) {
      return { props: { ssrError: 'Site not found', initialSubdomain: subdomain } };
    }
    let siteData = await siteResponse.json();

    if (!siteData || !siteData.user_id) {
      return { props: { ssrError: 'Site not found', initialSubdomain: subdomain } };
    }

    const [profileResponse, productsResponse] = await Promise.all([
      fetch(`${apiUrl}/api/v2/users/${siteData.user_id}`),
      fetch(`${apiUrl}/api/v2/catalog/public/products?vendor_id=${siteData.user_id}&limit=12`),
    ]);

    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      const profileData = profileResult.data || profileResult;
      const customizationKeys = ['primary_color', 'secondary_color', 'text_color', 'accent_color', 'background_color'];
      const fromResolve = {};
      customizationKeys.forEach(k => { if (siteData[k] != null) fromResolve[k] = siteData[k]; });
      const siteId = siteData.id;
      siteData = { ...siteData, ...profileData, ...fromResolve, id: siteId };
    }

    let products = [];
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const productsArray = productsData.data || [];
      products = Array.isArray(productsArray) ? productsArray.slice(0, 12) : [];
    }

    const templateSlug = siteData.template_slug || 'classic-gallery';
    const hasTemplateScript = fs.existsSync(
      path.join(process.cwd(), 'public', 'templates', templateSlug, 'script.js')
    );

    const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

    return {
      props: sanitize({
        initialSiteData: siteData,
        initialProducts: products,
        initialSubdomain: subdomain,
        hasTemplateScript,
      })
    };
  } catch (err) {
    console.error('SSR error fetching storefront data:', err.message);
    return {
      props: {
        ssrError: 'Failed to load storefront data',
        initialSubdomain: subdomain,
      }
    };
  }
}

export default ArtistStorefront;

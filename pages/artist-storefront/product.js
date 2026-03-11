import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import WholesalePricing from '../../components/WholesalePricing';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { config, getSmartMediaUrl, getSubdomainBase } from '../../lib/config';
import TemplateLoader from '../../components/sites-modules/TemplateLoader';

const ArtistProductDetail = ({
  initialSiteData,
  initialProduct,
  initialSubdomain,
  hasTemplateScript,
  ssrError
}) => {
  const router = useRouter();
  const subdomain = initialSubdomain || router.query.subdomain;
  const siteData = initialSiteData;
  const product = initialProduct;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [userData, setUserData] = useState(null);

  const subdomainBase = getSubdomainBase();
  const siteUrl = siteData?.custom_domain
    ? `https://${siteData.custom_domain}`
    : `https://${subdomain}.${subdomainBase}`;

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        setUserData(JSON.parse(atob(token.split('.')[1])));
      } catch (e) {}
    }
  }, []);

  const resolveMediaUrl = (val) => {
    if (!val) return null;
    if (val.startsWith('http')) return val;
    if (val.startsWith('/temp_images/')) return `${config.API_BASE_URL}${val}`;
    return getSmartMediaUrl(val);
  };

  const getAllImages = (p) => {
    if (!p) return [];
    const images = [];
    const main = resolveMediaUrl(p.image_url || p.image_path);
    if (main) images.push(main);
    if (p.images?.length) {
      p.images.forEach(img => {
        const url = resolveMediaUrl(typeof img === 'string' ? img : img.url);
        if (url && !images.includes(url)) images.push(url);
      });
    }
    return images;
  };

  const addToCart = async () => {
    try {
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
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${config.API_BASE_URL}/api/v2/commerce/cart/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: product.id,
          vendor_id: product.vendor_id || siteData?.user_id,
          quantity,
          price: product.price,
          source_site_api_key: subdomain,
          ...(guestToken && { guest_token: guestToken })
        })
      });
      if (response.ok) {
        const notification = document.createElement('div');
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:15px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;';
        notification.textContent = `Added "${product.name}" to cart!`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const getCustomStyles = () => {
    if (!siteData) return {};
    return {
      '--text-color': siteData.text_color,
      '--main-color': siteData.primary_color,
      '--secondary-color': siteData.secondary_color,
    };
  };

  if (ssrError || !product || !siteData) {
    return (
      <div className="error">
        <h1>Product Not Found</h1>
        <p>{ssrError || 'The requested product could not be found.'}</p>
      </div>
    );
  }

  const images = getAllImages(product);
  const displayName = siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`;

  const templateCustomizations = {
    primary_color: siteData.primary_color,
    secondary_color: siteData.secondary_color,
    text_color: siteData.text_color,
    body_font: siteData.body_font,
    header_font: siteData.header_font,
  };

  return (
    <>
      <Head>
        <title>{product.name} - {displayName}</title>
        <meta name="description" content={product.description || `${product.name} by ${displayName}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/product/${product.id}`} />
      </Head>

      <TemplateLoader
        templateSlug={siteData.template_slug || 'classic-gallery'}
        customizations={templateCustomizations}
        templateData={siteData.template_data || {}}
        customCSS={siteData.custom_css}
        hasScript={hasTemplateScript}
      />

      <div className="storefront" style={getCustomStyles()}>
        <header className="site-header">
          <div className="header-container">
            {siteData.logo_path ? (
              <Link href={siteUrl} className="site-logo">
                <img src={siteData.logo_path} alt="Logo" style={{ maxHeight: '48px', width: 'auto', display: 'block' }} />
              </Link>
            ) : (
              <Link href={siteUrl} className="site-logo">{displayName}</Link>
            )}
            <nav className="site-nav">
              <Link href={siteUrl} className="nav-link">Home</Link>
              <Link href={`${siteUrl}/products`} className="nav-link">Gallery</Link>
            </nav>
          </div>
        </header>

        <section className="product-section">
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: images.length ? '1fr 1fr' : '1fr', gap: '3rem', alignItems: 'start' }}>
            {images.length > 0 && (
              <div>
                <div className="product-image-wrapper">
                  <img src={images[selectedImage]} alt={product.name} className="product-image" style={{ width: '100%', borderRadius: 'var(--border-radius, 8px)' }} />
                </div>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`${product.name} ${i + 1}`}
                        onClick={() => setSelectedImage(i)}
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: selectedImage === i ? '2px solid var(--main-color, #333)' : '2px solid transparent' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="product-info">
              <h1 className="product-title" style={{ fontSize: '2rem' }}>{product.name}</h1>
              <WholesalePricing
                price={product.price}
                wholesalePrice={product.wholesale_price}
                isWholesaleCustomer={isWholesaleCustomer(userData)}
                size="large"
                layout="stacked"
                className="product-price"
              />

              {product.description && (
                <p className="product-description" style={{ marginTop: '1.5rem' }}>{product.description}</p>
              )}

              {product.dimensions && (
                <p style={{ marginTop: '1rem', opacity: 0.7 }}>Dimensions: {product.dimensions}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                <label htmlFor="qty">Qty:</label>
                <input
                  id="qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                />
                <button className="hero-cta" onClick={addToCart}>
                  Add to Cart — ${(product.price * quantity).toFixed(2)}
                </button>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <Link href={`${siteUrl}/products`} className="nav-link">← Back to Gallery</Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-container">
            <p className="footer-text">
              &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
            </p>
            <p className="footer-text">
              Powered by <a href="https://brakebee.com" target="_blank" rel="noopener noreferrer" className="footer-link">Brakebee</a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export async function getServerSideProps(context) {
  const fs = require('fs');
  const path = require('path');
  const { subdomain, productId } = context.query;
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.brakebee.com';

  if (!subdomain || !productId) {
    return { props: { ssrError: 'Missing parameters' } };
  }

  try {
    const [siteResponse, productResponse] = await Promise.all([
      fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}`),
      fetch(`${apiUrl}/api/v2/catalog/public/products/${productId}`)
    ]);

    if (!siteResponse.ok) {
      return { props: { ssrError: 'Site not found', initialSubdomain: subdomain } };
    }

    let siteData = await siteResponse.json();

    const profileResponse = await fetch(`${apiUrl}/api/v2/users/${siteData.user_id}`);
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      const profileData = profileResult.data || profileResult;
      const customizationKeys = ['primary_color', 'secondary_color', 'text_color', 'accent_color', 'background_color'];
      const fromResolve = {};
      customizationKeys.forEach(k => { if (siteData[k] != null) fromResolve[k] = siteData[k]; });
      const siteId = siteData.id;
      siteData = { ...siteData, ...profileData, ...fromResolve, id: siteId };
    }

    let product = null;
    if (productResponse.ok) {
      const data = await productResponse.json();
      product = data.data || data;
    }

    if (!product) {
      return { props: { ssrError: 'Product not found', initialSubdomain: subdomain } };
    }

    const templateSlug = siteData.template_slug || 'classic-gallery';
    const hasTemplateScript = fs.existsSync(
      path.join(process.cwd(), 'public', 'templates', templateSlug, 'script.js')
    );

    const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

    return {
      props: sanitize({
        initialSiteData: siteData,
        initialProduct: product,
        initialSubdomain: subdomain,
        hasTemplateScript,
      })
    };
  } catch (err) {
    console.error('SSR error:', err.message);
    return { props: { ssrError: 'Failed to load', initialSubdomain: subdomain } };
  }
}

export default ArtistProductDetail;

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { config, getSubdomainBase } from '../../lib/config';

const ArtistProducts = ({
  initialSiteData,
  initialProducts,
  initialCategories,
  initialSubdomain,
  ssrError
}) => {
  const router = useRouter();
  const subdomain = initialSubdomain || router.query.subdomain;

  const [siteData] = useState(initialSiteData || null);
  const [products] = useState(initialProducts || []);
  const [error] = useState(ssrError || null);

  const subdomainBase = getSubdomainBase();
  const siteUrl = siteData?.custom_domain
    ? `https://${siteData.custom_domain}`
    : `https://${subdomain}.${subdomainBase}`;

  const addToCart = async (productId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

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
          vendor_id: product.vendor_id || siteData.user_id,
          quantity: 1,
          price: product.price,
          source_site_api_key: subdomain,
          source_site_name: siteData.site_name || siteData.business_name,
          ...(guestToken && { guest_token: guestToken })
        })
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
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const getImageUrl = (product) => {
    const resolve = (val) => {
      if (!val) return null;
      if (val.startsWith('http')) return val;
      if (val.startsWith('/temp_images/')) return `${config.API_BASE_URL}${val}`;
      return val;
    };
    return resolve(product.image_url || product.image_path || (product.images?.[0]?.url || product.images?.[0]));
  };

  if (error || !siteData) {
    return (
      <div className="error">
        <h1>Gallery Not Found</h1>
        <p>Sorry, this gallery is not available.</p>
      </div>
    );
  }

  const pageTitle = `Gallery - ${siteData.business_name || siteData.display_name || `${siteData.first_name} ${siteData.last_name}`}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={`Browse the complete art gallery of ${siteData.business_name || siteData.first_name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/products`} />
      </Head>

      <section className="product-section">
        <h2 className="section-title">Complete Gallery</h2>

        {products.length === 0 ? (
          <p>No artworks available at the moment.</p>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <Link key={product.id} href={`/product/${product.id}`} className="product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-image-wrapper">
                  {getImageUrl(product) ? (
                    <img src={getImageUrl(product)} alt={product.alt_text || product.name} className="product-image" />
                  ) : (
                    <div className="product-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', minHeight: '200px' }}>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-price">${Number(product.price).toFixed(2)}</p>
                  {product.description && (
                    <p className="product-description">
                      {product.description.substring(0, 120)}{product.description.length > 120 && '...'}
                    </p>
                  )}
                  <button className="hero-cta" onClick={(e) => { e.preventDefault(); addToCart(product.id); }}>Add to Cart</button>
                </div>
              </Link>
            ))}
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

    const [profileResponse, productsResponse, categoriesResponse] = await Promise.all([
      fetch(`${apiUrl}/api/v2/users/${siteData.user_id}`),
      fetch(`${apiUrl}/api/v2/catalog/public/products?vendor_id=${siteData.user_id}&limit=100`),
      fetch(`${apiUrl}/api/v2/websites/resolve/${subdomain}/categories`)
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
      const data = await productsResponse.json();
      products = Array.isArray(data.data || data) ? (data.data || data) : [];
    }

    let categories = [];
    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
      if (!Array.isArray(categories)) categories = [];
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
        initialCategories: categories,
        initialSubdomain: subdomain,
        hasTemplateScript,
      })
    };
  } catch (err) {
    console.error('SSR error:', err.message);
    return { props: { ssrError: 'Failed to load', initialSubdomain: subdomain } };
  }
}

export default ArtistProducts;

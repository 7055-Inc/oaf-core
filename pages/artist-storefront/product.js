import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import WholesalePricing from '../../components/WholesalePricing';
import StorefrontVariationSelector from '../../components/sites-modules/StorefrontVariationSelector';
import { isWholesaleCustomer } from '../../lib/userUtils';
import { getAuthToken } from '../../lib/csrf';
import { config, getSmartMediaUrl, getSubdomainBase } from '../../lib/config';

const ArtistProductDetail = ({
  initialSiteData,
  initialProduct,
  initialSubdomain,
  ssrError
}) => {
  const router = useRouter();
  const subdomain = initialSubdomain || router.query.subdomain;
  const siteData = initialSiteData;
  const product = initialProduct;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [userData, setUserData] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [selectedVariationProduct, setSelectedVariationProduct] = useState(null);

  const isVariable = product?.product_type === 'variable' && product?.children?.length > 0;

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

  useEffect(() => {
    if (!product || !isVariable) return;

    if (product.variation_types && product.variation_options) {
      setVariationData({
        variation_types: product.variation_types,
        variation_options: product.variation_options,
        child_products: product.children.map(child => ({
          ...child,
          inventory: child.inventory || { qty_available: 0 }
        }))
      });
    } else {
      const variationTypes = [];
      const variationOptions = {};

      product.children.forEach(child => {
        if (child.variations) {
          Object.keys(child.variations).forEach(typeName => {
            if (!variationTypes.find(t => t.variation_name === typeName)) {
              variationTypes.push({ variation_name: typeName });
            }
            if (!variationOptions[typeName]) {
              variationOptions[typeName] = [];
            }
            child.variations[typeName].forEach(value => {
              if (!variationOptions[typeName].find(v => v.value_name === value.value_name)) {
                variationOptions[typeName].push(value);
              }
            });
          });
        }
      });

      setVariationData({
        variation_types: variationTypes,
        variation_options: variationOptions,
        child_products: product.children.map(child => ({
          ...child,
          inventory: child.inventory || { qty_available: 0 }
        }))
      });
    }
  }, [product]);

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

  const showNotification = (message) => {
    const notification = document.createElement('div');
    const cs = getComputedStyle(document.querySelector('.storefront') || document.documentElement);
    const bg = cs.getPropertyValue('--main-color').trim() || '#333';
    const fg = cs.getPropertyValue('--background-color').trim() || '#fff';
    const radius = cs.getPropertyValue('--border-radius').trim() || '8px';
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:${fg};padding:15px 20px;border-radius:${radius};box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;font-family:var(--body-font,sans-serif);`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const doAddToCart = async (targetProduct, qty) => {
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
          product_id: targetProduct.id,
          vendor_id: targetProduct.vendor_id || siteData?.user_id,
          quantity: qty,
          price: targetProduct.price,
          source_site_api_key: subdomain,
          ...(guestToken && { guest_token: guestToken })
        })
      });
      if (response.ok) {
        showNotification(`Added "${targetProduct.name || product.name}" to cart!`);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const addSimpleToCart = () => doAddToCart(product, quantity);

  const addVariantToCart = (variantProduct, qty) => doAddToCart(variantProduct, qty);

  const handleVariationChange = (variantProduct) => {
    setSelectedVariationProduct(variantProduct);
    if (variantProduct) {
      const variantImages = getAllImages(variantProduct);
      if (variantImages.length > 0) {
        const parentImages = getAllImages(product);
        const idx = parentImages.indexOf(variantImages[0]);
        if (idx >= 0) setSelectedImage(idx);
      }
    }
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
  const displayPrice = isVariable && selectedVariationProduct
    ? selectedVariationProduct.price
    : product.price;

  return (
    <>
      <Head>
        <title>{product.name} - {displayName}</title>
        <meta name="description" content={product.description || `${product.name} by ${displayName}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/product/${product.id}`} />
      </Head>

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

            {/* Simple product: show price directly */}
            {!isVariable && (
              <WholesalePricing
                price={product.price}
                wholesalePrice={product.wholesale_price}
                isWholesaleCustomer={isWholesaleCustomer(userData)}
                size="large"
                layout="stacked"
                className="product-price"
              />
            )}

            {/* Variable product: show starting price hint before selection */}
            {isVariable && !selectedVariationProduct && (
              <p style={{ fontSize: '1.1rem', opacity: 0.7, margin: '0.5rem 0' }}>
                From ${parseFloat(product.price || 0).toFixed(2)}
              </p>
            )}

            {product.description && (
              <p className="product-description" style={{ marginTop: '1.5rem' }}>{product.description}</p>
            )}

            {product.dimensions && (
              <p style={{ marginTop: '1rem', opacity: 0.7 }}>Dimensions: {product.dimensions}</p>
            )}

            {/* Variable product: variation selector handles qty + add-to-cart */}
            {isVariable && variationData && (
              <StorefrontVariationSelector
                variationData={variationData}
                onVariationChange={handleVariationChange}
                onAddToCart={addVariantToCart}
                initialQuantity={1}
              />
            )}

            {/* Simple product: qty + add-to-cart */}
            {!isVariable && (
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
                <button className="hero-cta" onClick={addSimpleToCart}>
                  Add to Cart — ${(product.price * quantity).toFixed(2)}
                </button>
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <Link href="/products" className="nav-link">← Back to Gallery</Link>
            </div>
          </div>
        </div>
      </section>
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

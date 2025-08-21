import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from './ArtistStorefront.module.css';

const ArtistProductDetail = () => {
  const router = useRouter();
  const { subdomain, productId, userId, siteName } = router.query;
  
  const [siteData, setSiteData] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Image URL helper function (same as other components)
  const getImageUrl = (product) => {
    // Check for image_url first (this is the main product image field)
    if (product.image_url) {
      if (product.image_url.startsWith('http')) return product.image_url;
      return `https://api2.onlineartfestival.com/api/media/serve/${product.image_url}`;
    }
    // Check for image_path (legacy field)
    if (product.image_path) {
      if (product.image_path.startsWith('http')) return product.image_path;
      return `https://api2.onlineartfestival.com/api/media/serve/${product.image_path}`;
    }
    // Check for images array (from the include=images parameter)
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      if (img.startsWith('http')) return img;
      return `https://api2.onlineartfestival.com/api/media/serve/${img}`;
    }
    return null; // No image available
  };

  const getAllImages = (product) => {
    const images = [];
    
    // Add main image if exists
    const mainImage = getImageUrl(product);
    if (mainImage) {
      images.push(mainImage);
    }
    
    // Add additional images from images array
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        const imageUrl = img.startsWith('http') ? img : `https://api2.onlineartfestival.com/api/media/serve/${img}`;
        if (!images.includes(imageUrl)) {
          images.push(imageUrl);
        }
      });
    }
    
    return images;
  };

  useEffect(() => {
    if (subdomain && productId) {
      fetchData();
    }
  }, [subdomain, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch site data and product data in parallel
      const [siteResponse, productResponse] = await Promise.all([
        fetch(`https://api2.onlineartfestival.com/api/sites/resolve/${subdomain}`),
        fetch(`https://api2.onlineartfestival.com/products/${productId}?include=images,shipping,vendor`)
      ]);

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        setSiteData(siteData);
      }

      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProduct(productData);
      } else {
        setError('Product not found');
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId) => {
    // Basic add to cart functionality - you may want to expand this
    try {
      const response = await fetch('https://api2.onlineartfestival.com/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity
        }),
      });

      if (response.ok) {
        alert('Product added to cart!');
      } else {
        alert('Failed to add product to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding product to cart');
    }
  };

  // Dynamic styles for site theming
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <h1>Product Not Found</h1>
        <p>{error || 'The requested product could not be found.'}</p>
        <Link href="/">
          <a className={styles.backButton}>← Back to Gallery</a>
        </Link>
      </div>
    );
  }

  const images = getAllImages(product);
  const displaySiteName = siteData?.site_name || subdomain;

  return (
    <>
      <Head>
        <title>{product.name} - {displaySiteName}</title>
        <meta name="description" content={product.description || `${product.name} by ${displaySiteName}`} />
      </Head>

      <div className={styles.container} style={getCustomStyles()}>
        <nav className={styles.breadcrumb}>
          <Link href="/"><a>Gallery</a></Link>
          <span> / </span>
          <span>{product.name}</span>
        </nav>

        <div className={styles.productDetail}>
          <div className={styles.productImages}>
            {images.length > 0 ? (
              <>
                <div className={styles.mainImage}>
                  <img 
                    src={images[selectedImage]} 
                    alt={product.name}
                    className={styles.productMainImage}
                  />
                </div>
                {images.length > 1 && (
                  <div className={styles.thumbnails}>
                    {images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className={`${styles.thumbnail} ${selectedImage === index ? styles.active : ''}`}
                        onClick={() => setSelectedImage(index)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noImage}>
                <span>No Image Available</span>
              </div>
            )}
          </div>

          <div className={styles.productInfo}>
            <h1 className={styles.productTitle}>{product.name}</h1>
            <p className={styles.productPrice}>${product.price}</p>
            
            {product.description && (
              <div className={styles.productDescription}>
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}

            {product.dimensions && (
              <div className={styles.productDimensions}>
                <h3>Dimensions</h3>
                <p>{product.dimensions}</p>
              </div>
            )}

            <div className={styles.purchaseSection}>
              <div className={styles.quantitySelector}>
                <label htmlFor="quantity">Quantity:</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
              </div>
              
              <button 
                className={styles.addToCartBtn}
                onClick={() => addToCart(product.id)}
              >
                Add to Cart - ${(product.price * quantity).toFixed(2)}
              </button>
            </div>

            <div className={styles.backToGallery}>
              <Link href="/">
                <a className={styles.backButton}>← Back to Gallery</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtistProductDetail;

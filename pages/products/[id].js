'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../components/Header';
import styles from './styles/ProductView.module.css';

export default function ProductView() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = document.cookie.split('token=')[1]?.split(';')[0];
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const res = await fetch(`https://api2.onlineartfestival.com/products/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch product');
        
        const data = await res.json();
        console.log('Full product data:', JSON.stringify(data, null, 2));
        
        // Check if images exist in the response
        if (!data.images) {
          console.log('No images found in product data');
          // Set a default empty array for images
          data.images = [];
        }

        // Ensure image URLs are absolute
        const images = data.images.map(img => {
          if (img.startsWith('http')) return img;
          return `https://api2.onlineartfestival.com${img}`;
        });

        console.log('Processed images:', images);

        setProduct({
          ...data,
          images: images
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleAddToCart = async () => {
    if (!product?.id) return;

    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        setError('Authentication required');
        return;
      }

      // First, get or create a cart for the user
      let cartId;
      
      // Try to get existing cart
      const cartRes = await fetch('https://api2.onlineartfestival.com/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (cartRes.ok) {
        const carts = await cartRes.json();
        // Find an active cart or create one
        const activeCart = carts.find(cart => cart.status === 'draft');
        
        if (activeCart) {
          cartId = activeCart.id;
        } else {
          // Create a new cart
          const createCartRes = await fetch('https://api2.onlineartfestival.com/cart', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'draft'
            })
          });

          if (!createCartRes.ok) throw new Error('Failed to create cart');
          
          const cartData = await createCartRes.json();
          cartId = cartData.cart.id;
        }
      } else {
        throw new Error('Failed to get cart information');
      }

      // Now add the item to the cart
      const addItemRes = await fetch(`https://api2.onlineartfestival.com/cart/${cartId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: product.id,
          vendor_id: product.vendor_id,
          quantity: quantity,
          price: product.price
        })
      });

      if (!addItemRes.ok) {
        const errorData = await addItemRes.json();
        throw new Error(errorData.error || 'Failed to add to cart');
      }
      
      // Show success message and redirect to cart
      alert('Item added to cart successfully!');
      router.push('/cart');
      
    } catch (err) {
      console.error('Add to cart error:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>Product not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content}>
        <div className={styles.productGrid}>
          <div className={styles.imageSection}>
            {product.images?.length > 0 ? (
              <>
                <div className={styles.mainImage}>
                  <img 
                    src={product.images[selectedImage]} 
                    alt={product.name || 'Product image'}
                    className={styles.image}
                    onError={(e) => {
                      console.error('Main image failed to load:', product.images[selectedImage]);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                {product.images.length > 1 && (
                  <div className={styles.thumbnailGrid}>
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        className={`${styles.thumbnail} ${selectedImage === index ? styles.selected : ''}`}
                        onClick={() => setSelectedImage(index)}
                      >
                        <img 
                          src={image} 
                          alt={`${product.name} ${index + 1}`}
                          onError={(e) => {
                            console.error('Thumbnail failed to load:', image);
                            e.target.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noImage}>
                No images available
              </div>
            )}
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{product.name}</h1>
            
            <div className={styles.price}>
              ${parseFloat(product.price || 0).toFixed(2)}
            </div>

            <div className={styles.description}>
              {product.short_description}
            </div>

            <div className={styles.fullDescription}>
              {product.description}
            </div>

            <div className={styles.dimensions}>
              <h3>Dimensions</h3>
              <div className={styles.dimensionGrid}>
                <div className={styles.dimension}>
                  <span>Width:</span>
                  <span>{product.width} {product.dimension_unit}</span>
                </div>
                <div className={styles.dimension}>
                  <span>Height:</span>
                  <span>{product.height} {product.dimension_unit}</span>
                </div>
                <div className={styles.dimension}>
                  <span>Depth:</span>
                  <span>{product.depth} {product.dimension_unit}</span>
                </div>
                <div className={styles.dimension}>
                  <span>Weight:</span>
                  <span>{product.weight} {product.weight_unit}</span>
                </div>
              </div>
            </div>

            <div className={styles.availability}>
              <span className={styles.label}>Availability:</span>
              <span className={styles.value}>
                {product.available_qty > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {product.available_qty > 0 && (
              <div className={styles.addToCart}>
                <div className={styles.quantity}>
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className={styles.quantityButton}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={product.available_qty}
                    className={styles.quantityInput}
                  />
                  <button 
                    onClick={() => setQuantity(Math.min(product.available_qty, quantity + 1))}
                    className={styles.quantityButton}
                  >
                    +
                  </button>
                </div>

                <button 
                  onClick={handleAddToCart}
                  className={styles.addToCartButton}
                >
                  Add to Cart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
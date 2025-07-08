import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../../components/Header';
import { authenticatedApiRequest } from '../../lib/csrf';
import styles from './styles/UnifiedCart.module.css';

export default function UnifiedCart() {
  const [unifiedCartData, setUnifiedCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const router = useRouter();

  useEffect(() => {
    fetchUnifiedCart();
  }, []);

  const fetchUnifiedCart = async () => {
    try {
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        setError('Please log in to view your cart');
        setLoading(false);
        return;
      }

      const response = await fetch('https://api2.onlineartfestival.com/cart/unified', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnifiedCartData(data);
        
        // Auto-expand sources with items
        const autoExpand = {};
        Object.keys(data.grouped_by_source).forEach(sourceName => {
          if (data.grouped_by_source[sourceName].total_items > 0) {
            autoExpand[sourceName] = true;
          }
        });
        setExpandedSources(autoExpand);
      } else {
        throw new Error('Failed to fetch cart data');
      }
    } catch (err) {
      console.error('Error fetching unified cart:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (sourceName) => {
    setExpandedSources(prev => ({
      ...prev,
      [sourceName]: !prev[sourceName]
    }));
  };

  const updateQuantity = async (cartId, itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/cart/${cartId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: newQuantity,
          price: null // Keep existing price
        })
      });

      if (response.ok) {
        // Refresh cart data
        fetchUnifiedCart();
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeItem = async (cartId, itemId) => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/cart/${cartId}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh cart data
        fetchUnifiedCart();
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const proceedToCheckout = () => {
    // Create checkout data from all carts
    const checkoutData = {
      unified_cart: unifiedCartData,
      total_items: unifiedCartData.total_items,
      total_value: unifiedCartData.total_value,
      checkout_type: 'unified_multi_cart'
    };
    
    localStorage.setItem('checkoutCart', JSON.stringify(checkoutData));
    router.push('/checkout');
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>My Cart - Digital Art Mall</title>
        </Head>
        <div className={styles.container}>
          <Header />
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your art collection...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>My Cart - Digital Art Mall</title>
        </Head>
        <div className={styles.container}>
          <Header />
          <div className={styles.error}>
            <h2>Unable to Load Cart</h2>
            <p>{error}</p>
            <button onClick={() => router.push('/login')} className={styles.loginButton}>
              Log In
            </button>
          </div>
        </div>
      </>
    );
  }

  const hasItems = unifiedCartData && unifiedCartData.total_items > 0;

  return (
    <>
      <Head>
        <title>My Cart - Digital Art Mall | Online Art Festival</title>
        <meta name="description" content="Your unified cart from multiple artist galleries" />
      </Head>
      
      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>🎨 My Digital Art Mall</h1>
            <p className={styles.subtitle}>
              Your curated collection from {Object.keys(unifiedCartData?.grouped_by_source || {}).length} artist galleries
            </p>
          </div>

          {!hasItems ? (
            <div className={styles.emptyCart}>
              <div className={styles.emptyIcon}>🛒</div>
              <h2>Your art collection is empty</h2>
              <p>Discover amazing artworks from our talented artists</p>
              <button 
                className={styles.exploreButton}
                onClick={() => router.push('/')}
              >
                Explore Galleries
              </button>
            </div>
          ) : (
            <>
              {/* Cart Summary */}
              <div className={styles.cartSummary}>
                <div className={styles.summaryCard}>
                  <h3>Cart Summary</h3>
                  <div className={styles.summaryStats}>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>{unifiedCartData.total_items}</span>
                      <span className={styles.statLabel}>Items</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>{Object.keys(unifiedCartData.grouped_by_source).length}</span>
                      <span className={styles.statLabel}>Galleries</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>${unifiedCartData.total_value.toFixed(2)}</span>
                      <span className={styles.statLabel}>Total</span>
                    </div>
                  </div>
                  <button 
                    className={styles.checkoutButton}
                    onClick={proceedToCheckout}
                  >
                    Proceed to Checkout → ${unifiedCartData.total_value.toFixed(2)}
                  </button>
                </div>
              </div>

              {/* Carts by Source */}
              <div className={styles.cartsBySource}>
                {Object.entries(unifiedCartData.grouped_by_source).map(([sourceName, sourceData]) => (
                  <div key={sourceName} className={styles.sourceSection}>
                    <div 
                      className={styles.sourceHeader}
                      onClick={() => toggleSource(sourceName)}
                    >
                      <div className={styles.sourceInfo}>
                        <h3 className={styles.sourceName}>
                          🎨 {sourceName}
                        </h3>
                        <span className={styles.sourceStats}>
                          {sourceData.total_items} items • ${sourceData.total_value.toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.toggleIcon}>
                        {expandedSources[sourceName] ? '▼' : '▶'}
                      </div>
                    </div>

                    {expandedSources[sourceName] && (
                      <div className={styles.sourceContent}>
                        {sourceData.carts.map(cart => (
                          <div key={cart.id} className={styles.cartSection}>
                            {cart.items.length > 0 && (
                              <>
                                <div className={styles.cartHeader}>
                                  <span className={styles.cartDate}>
                                    Added {new Date(cart.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                
                                <div className={styles.cartItems}>
                                  {cart.items.map(item => (
                                    <div key={item.id} className={styles.cartItem}>
                                      <div className={styles.itemImage}>
                                        {item.image_path ? (
                                          <img 
                                            src={`https://api2.onlineartfestival.com${item.image_path}`}
                                            alt={item.product_name}
                                          />
                                        ) : (
                                          <div className={styles.placeholderImage}>
                                            🖼️
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className={styles.itemDetails}>
                                        <h4 className={styles.itemName}>{item.product_name}</h4>
                                        <p className={styles.itemVendor}>by {item.vendor_display_name}</p>
                                        <p className={styles.itemPrice}>${parseFloat(item.price).toFixed(2)}</p>
                                      </div>
                                      
                                      <div className={styles.itemControls}>
                                        <div className={styles.quantityControls}>
                                          <button 
                                            onClick={() => updateQuantity(cart.id, item.id, item.quantity - 1)}
                                            className={styles.quantityBtn}
                                            disabled={item.quantity <= 1}
                                          >
                                            -
                                          </button>
                                          <span className={styles.quantity}>{item.quantity}</span>
                                          <button 
                                            onClick={() => updateQuantity(cart.id, item.id, item.quantity + 1)}
                                            className={styles.quantityBtn}
                                          >
                                            +
                                          </button>
                                        </div>
                                        
                                        <button 
                                          onClick={() => removeItem(cart.id, item.id)}
                                          className={styles.removeBtn}
                                          title="Remove item"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Checkout */}
              <div className={styles.bottomCheckout}>
                <div className={styles.checkoutSummary}>
                  <span className={styles.totalLabel}>Total: ${unifiedCartData.total_value.toFixed(2)}</span>
                  <button 
                    className={styles.checkoutButtonLarge}
                    onClick={proceedToCheckout}
                  >
                    Checkout All Items
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
} 
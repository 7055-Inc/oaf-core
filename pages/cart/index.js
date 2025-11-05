import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { authApiRequest } from '../../lib/apiUtils';
import { handleCsrfError } from '../../lib/csrf';
import { getApiUrl } from '../../lib/config';
import CouponEntry from '../../components/coupons/CouponEntry';
import DiscountSummary from '../../components/coupons/DiscountSummary';
import { useCoupons } from '../../hooks/useCoupons';
import styles from './styles/Cart.module.css';

export default function Cart() {
  const [activeCart, setActiveCart] = useState(null);
  const [cartCollections, setCartCollections] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCollections, setExpandedCollections] = useState({});
  const [cartTotal, setCartTotal] = useState(0);
  const router = useRouter();

  // Coupon functionality
  const {
    appliedCoupons,
    autoDiscounts,
    loading: couponLoading,
    applyCoupon,
    removeCoupon,
    getAutoDiscounts,
    calculateTotalsWithDiscounts,
    clearAllCoupons
  } = useCoupons();

  useEffect(() => {
    fetchCartData();
  }, []);

  // Recalculate totals when coupons change
  useEffect(() => {
    if (cartItems.length > 0) {
      recalculateCartTotals();
      getAutoDiscounts(cartItems);
    }
  }, [appliedCoupons, cartItems, getAutoDiscounts]);

  const recalculateCartTotals = async () => {
    if (cartItems.length === 0) return;

    try {
      const totals = await calculateTotalsWithDiscounts(cartItems);
      setCartItems(totals.items || cartItems); // Update items with discount info
      setCartTotal(totals.total || calculateTotal());
    } catch (error) {
      console.error('Failed to recalculate totals:', error);
      setCartTotal(calculateTotal()); // Fallback to original calculation
    }
  };

  const getAuthToken = () => {
    return document.cookie.split('token=')[1]?.split(';')[0];
  };

  const fetchCartData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Fetch active cart
      const cartRes = await fetch(getApiUrl('cart'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (cartRes.ok) {
        const carts = await cartRes.json();
        const active = carts.find(cart => cart.status === 'draft') || carts[0];
        setActiveCart(active);

        // Fetch active cart items
        if (active) {
          const itemsRes = await fetch(getApiUrl(`cart/${active.id}/items`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (itemsRes.ok) {
            const items = await itemsRes.json();
            setCartItems(items);
          }
        }
      }

      // Fetch cart collections
      const collectionsRes = await fetch(getApiUrl('cart/collections'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (collectionsRes.ok) {
        const collections = await collectionsRes.json();
        setCartCollections(collections);
      }

    } catch (err) {
      console.error('Error fetching cart data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const item = cartItems.find(item => item.id === itemId);
      
      const res = await authApiRequest(`cart/${activeCart.id}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: newQuantity,
          price: item.price
        })
      });

      if (res.ok) {
        setCartItems(items => 
          items.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
      handleCsrfError(err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await authApiRequest(`cart/${activeCart.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setCartItems(items => items.filter(item => item.id !== itemId));
      }
    } catch (err) {
      console.error('Error removing item:', err);
      handleCsrfError(err);
    }
  };

  const saveForLater = async (item) => {
    try {
      // Add to saved items
      const saveRes = await authApiRequest('cart/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: '',
          collection_name: 'Saved for Later'
        })
      });

      if (saveRes.ok) {
        // Remove from cart
        await removeItem(item.id);
      }
    } catch (err) {
      console.error('Error saving for later:', err);
      handleCsrfError(err);
    }
  };

  const toggleCollection = (collectionId) => {
    setExpandedCollections(prev => ({
      ...prev,
      [collectionId]: !prev[collectionId]
    }));
  };

  const makeCartActive = async (cartId) => {
    try {
      const token = getAuthToken();
      
      // Update current active cart to abandoned
      if (activeCart) {
        await fetch(getApiUrl(`cart/${activeCart.id}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'abandoned' })
        });
      }

      // Update new cart to draft (active)
      await fetch(getApiUrl(`cart/${cartId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'draft' })
      });

      // Refresh cart data
      fetchCartData();
    } catch (err) {
      console.error('Error switching active cart:', err);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0).toFixed(2);
  };

  const proceedToCheckout = () => {
    // Store cart items and coupon data in localStorage for the checkout page
    const checkoutData = {
      items: cartItems,
      appliedCoupons: appliedCoupons,
      autoDiscounts: autoDiscounts,
      total: cartTotal
    };
    localStorage.setItem('checkoutCart', JSON.stringify(checkoutData));
    // Navigate to checkout page
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading cart...</div>
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

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.content} style={{marginTop: '120px'}}>
          {cartItems.length > 0 && (
            <div className="section-box">
              <p style={{color: 'var(--secondary-color)', fontWeight: '600', marginBottom: '1rem'}}>
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
              </p>
            </div>
          )}

        {/* Active Cart Section */}
        <div className="section-box">
          <h2 className={styles.sectionTitle}>Active Cart: {activeCart?.id ? `Cart #${activeCart.id}` : 'Default Cart'}</h2>
          
          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <p>Your cart is empty</p>
              <button 
                className={styles.continueButton}
                onClick={() => router.push('/products')}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className={styles.cartItems}>
              {cartItems.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>Product Title</h3>
                    <p style={{fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', margin: '5px 0'}}>
                      Product ID: {item.product_id}
                    </p>
                    <p className={styles.itemPrice}>${(parseFloat(item.price) || 0).toFixed(2)}</p>
                  </div>
                  
                  <div className={styles.itemControls}>
                    <div className={styles.quantityControls}>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="secondary"
                        style={{padding: '8px 12px', minWidth: '40px'}}
                      >
                        -
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="secondary"
                        style={{padding: '8px 12px', minWidth: '40px'}}
                      >
                        +
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => saveForLater(item)}
                      className="secondary"
                      style={{marginRight: '10px'}}
                    >
                      Save for Later
                    </button>
                    
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="secondary"
                      style={{color: 'red', borderColor: 'red', padding: '8px 12px'}}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Coupon Section */}
              <CouponEntry
                onApplyCoupon={(code) => applyCoupon(code, cartItems)}
                onRemoveCoupon={removeCoupon}
                appliedCoupons={appliedCoupons}
                loading={couponLoading}
                disabled={cartItems.length === 0}
              />

              {/* Discount Summary */}
              <DiscountSummary
                cartItems={cartItems}
                autoDiscounts={autoDiscounts}
                appliedCoupons={appliedCoupons}
                showItemBreakdown={true}
              />
              
              <div className="form-card" style={{textAlign: 'right'}}>
                <h1 style={{fontFamily: 'var(--font-heading)', color: 'var(--primary-color)', marginBottom: '1rem'}}>
                  Total: ${cartTotal > 0 ? (parseFloat(cartTotal) || 0).toFixed(2) : calculateTotal()}
                </h1>
                <button onClick={proceedToCheckout} className="secondary">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Collections Section */}
        {cartCollections.length > 0 && (
          <div className="section-box">
            <h2>📂 Other Cart Collections</h2>
            
            {cartCollections.map(collection => (
              <div key={collection.id} className={styles.collectionFolder}>
                <div 
                  className={styles.collectionHeader}
                  onClick={() => toggleCollection(collection.id)}
                >
                  <span className={styles.folderIcon}>
                    {expandedCollections[collection.id] ? '📂' : '📁'}
                  </span>
                  <h3 className={styles.collectionName}>{collection.name}</h3>
                  <span className={styles.itemCount}>0 items</span>
                </div>
                
                {expandedCollections[collection.id] && (
                  <div className={styles.collectionContent}>
                    <p className={styles.collectionDescription}>{collection.description}</p>
                    <button 
                      onClick={() => makeCartActive(collection.id)}
                      className={styles.makeActiveButton}
                    >
                      Make this cart active
                    </button>
                    <div className={styles.collectionItems}>
                      {/* Collection items would go here */}
                      <p className={styles.emptyCollection}>No items in this collection yet</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
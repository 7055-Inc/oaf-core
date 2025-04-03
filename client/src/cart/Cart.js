import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Cart.css';

function Cart() {
  const [cartData, setCartData] = useState({
    vendorGroups: [],
    appliedCoupons: [],
    savedItems: [],
    subtotal: 0,
    discount: 0,
    shippingTotal: 0,
    grandTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  
  useEffect(() => {
    fetchCartData();
  }, []);
  
  const fetchCartData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cart');
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      
      const data = await response.json();
      setCartData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  
  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const removeItem = async (itemId) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove item');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const saveForLater = async (itemId) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}/save`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save item for later');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const moveToCart = async (itemId) => {
    try {
      const response = await fetch(`/api/cart/items/${itemId}/move-to-cart`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to move item to cart');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const updateShippingMethod = async (vendorId, shippingMethodId) => {
    try {
      const response = await fetch(`/api/cart/vendor/${vendorId}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shippingMethodId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update shipping method');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const applyCoupon = async () => {
    try {
      setCouponError('');
      
      if (!couponCode.trim()) {
        setCouponError('Please enter a coupon code');
        return;
      }
      
      const response = await fetch('/api/cart/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply coupon');
      }
      
      const data = await response.json();
      setCartData(data);
      setCouponCode('');
    } catch (err) {
      setCouponError(err.message);
    }
  };
  
  const removeCoupon = async (couponId) => {
    try {
      const response = await fetch(`/api/cart/coupons/${couponId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove coupon');
      }
      
      const data = await response.json();
      setCartData(data);
    } catch (err) {
      setError(err.message);
    }
  };
  
  if (loading) return <div className="cart-loading">Loading your cart...</div>;
  if (error) return <div className="cart-error">Error: {error}</div>;
  
  return (
    <div className="cart-container">
      <h1>Your Cart</h1>
      
      {cartData.vendorGroups.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <Link to="/" className="continue-shopping">Continue Shopping</Link>
        </div>
      ) : (
        <>
          {/* Vendor Groups */}
          {cartData.vendorGroups.map(group => (
            <div key={group.vendor.id} className="vendor-group">
              <div className="vendor-header">
                <h2>{group.vendor.name}</h2>
              </div>
              
              {/* Items within this vendor group */}
              <div className="vendor-items">
                {group.items.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="item-image">
                      <img src={item.imageUrl} alt={item.name} />
                    </div>
                    <div className="item-details">
                      <h3>{item.name}</h3>
                      <p className="item-vendor">by {group.vendor.name}</p>
                      <p className="item-price">${item.price.toFixed(2)}</p>
                      
                      {item.stockAvailable <= 0 ? (
                        <div className="item-out-of-stock">
                          <p>Sorry, this item has sold out.</p>
                          <button onClick={() => removeItem(item.id)}>
                            Remove from cart
                          </button>
                          <button onClick={() => saveForLater(item.id)}>
                            Save for later
                          </button>
                        </div>
                      ) : (
                        <div className="item-quantity">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >-</button>
                          <span>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stockAvailable}
                          >+</button>
                        </div>
                      )}
                    </div>
                    
                    <div className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    
                    <div className="item-actions">
                      <button 
                        className="remove-item" 
                        onClick={() => removeItem(item.id)}
                      >
                        ✕
                      </button>
                      <button 
                        className="save-for-later" 
                        onClick={() => saveForLater(item.id)}
                      >
                        Save for later
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Shipping options for this vendor */}
              <div className="vendor-shipping">
                <h3>Shipping</h3>
                <select 
                  value={group.selectedShipping} 
                  onChange={(e) => updateShippingMethod(group.vendor.id, e.target.value)}
                >
                  {group.shippingMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.name} - 
                      {method.type === 'free' ? 'Free' : 
                       method.type === 'flat' ? `$${method.flat_rate.toFixed(2)}` : 
                       'Calculated at checkout'}
                    </option>
                  ))}
                </select>
                <div className="shipping-cost">
                  ${group.shippingCost.toFixed(2)}
                </div>
              </div>
              
              <div className="vendor-subtotal">
                <span>Subtotal:</span>
                <span>${group.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
          
          {/* Saved for Later Section */}
          {cartData.savedItems.length > 0 && (
            <div className="saved-for-later">
              <h2>Saved for Later</h2>
              {cartData.savedItems.map(item => (
                <div key={item.id} className="saved-item">
                  <div className="item-image">
                    <img src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-vendor">by {item.vendorName}</p>
                    <p className="item-price">${item.price.toFixed(2)}</p>
                    
                    {item.stockAvailable <= 0 ? (
                      <p className="out-of-stock">Currently out of stock</p>
                    ) : (
                      <button 
                        className="move-to-cart" 
                        onClick={() => moveToCart(item.id)}
                      >
                        Move to Cart
                      </button>
                    )}
                  </div>
                  <button 
                    className="remove-saved" 
                    onClick={() => removeItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Coupon section */}
          <div className="coupon-section">
            <h3>Apply Coupon</h3>
            <div className="coupon-form">
              <input 
                type="text" 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)} 
                placeholder="Enter coupon code"
              />
              <button onClick={applyCoupon}>Apply</button>
            </div>
            
            {couponError && (
              <div className="coupon-error">{couponError}</div>
            )}
            
            {/* Applied coupons */}
            {cartData.appliedCoupons.length > 0 && (
              <div className="applied-coupons">
                <h4>Applied Coupons</h4>
                {cartData.appliedCoupons.map(coupon => (
                  <div key={coupon.id} className="applied-coupon">
                    <span>{coupon.code} - ${coupon.discountAmount.toFixed(2)}</span>
                    <button onClick={() => removeCoupon(coupon.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Order summary */}
          <div className="cart-summary">
            <div className="subtotal">
              <span>Subtotal:</span>
              <span>${cartData.subtotal.toFixed(2)}</span>
            </div>
            
            {cartData.discount > 0 && (
              <div className="discount">
                <span>Discount:</span>
                <span>-${cartData.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="shipping-total">
              <span>Shipping:</span>
              <span>${cartData.shippingTotal.toFixed(2)}</span>
            </div>
            
            <div className="grand-total">
              <span>Total:</span>
              <span>${cartData.grandTotal.toFixed(2)}</span>
            </div>
            
            <p className="tax-note">Taxes calculated at checkout</p>
            <Link to="/checkout" className="checkout-button">Proceed to Checkout</Link>
            <Link to="/" className="continue-shopping">Continue Shopping</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;

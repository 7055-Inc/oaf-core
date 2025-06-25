import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import styles from '../styles/Checkout.module.css';

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const router = useRouter();

  // Test card numbers for easy reference
  const testCards = [
    { number: '4242 4242 4242 4242', type: 'Visa - Success' },
    { number: '4000 0000 0000 0002', type: 'Visa - Declined' },
    { number: '4000 0000 0000 9995', type: 'Visa - Insufficient Funds' },
    { number: '5555 5555 5555 4444', type: 'Mastercard - Success' }
  ];

  useEffect(() => {
    // Get cart data from localStorage or query params
    const cartData = localStorage.getItem('checkoutCart');
    if (cartData) {
      const items = JSON.parse(cartData);
      setCartItems(items);
      calculateOrderTotals(items);
    } else {
      // If no cart data, redirect back to cart
      router.push('/cart');
    }
  }, []);

  const getAuthToken = () => {
    return document.cookie.split('token=')[1]?.split(';')[0];
  };

  const calculateOrderTotals = async (items) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Convert cart items to the format our API expects
      const cart_items = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const response = await fetch('https://api2.onlineartfestival.com/checkout/calculate-totals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart_items })
      });

      if (response.ok) {
        const data = await response.json();
        setOrderSummary(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to calculate order totals');
      }
    } catch (err) {
      console.error('Error calculating totals:', err);
      setError('Failed to calculate order totals');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const token = getAuthToken();
      const cart_items = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const response = await fetch('https://api2.onlineartfestival.com/checkout/create-payment-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart_items })
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentIntent(data);
        setPaymentStatus('Payment intent created successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create payment intent');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to create payment intent');
    } finally {
      setProcessing(false);
    }
  };

  const simulatePayment = async (testCardType) => {
    if (!paymentIntent) {
      setError('Please create payment intent first');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      
      // Simulate payment processing
      setPaymentStatus(`Simulating payment with ${testCardType}...`);
      
      // Wait 2 seconds to simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (testCardType.includes('Success')) {
        setPaymentStatus('✅ Payment successful! (Simulated)');
        
        // In a real implementation, you would confirm the payment with Stripe
        // and then call your confirm-payment endpoint
        setTimeout(() => {
          setPaymentStatus('🎉 Order completed! Redirecting...');
          setTimeout(() => {
            localStorage.removeItem('checkoutCart');
            router.push('/dashboard?tab=orders');
          }, 2000);
        }, 1000);
        
      } else {
        setPaymentStatus('❌ Payment failed! (Simulated)');
        setError(`Payment declined: ${testCardType}`);
      }
    } catch (err) {
      console.error('Error simulating payment:', err);
      setError('Payment simulation failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>Loading checkout...</div>
      </div>
    );
  }

  if (error && !orderSummary) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>
          <h2>Checkout Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/cart')} className={styles.backButton}>
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - Online Art Festival</title>
      </Head>
      
      <div className={styles.container}>
        <Header />
        
        <div className={styles.content}>
          <h1 className={styles.title}>Checkout</h1>
          
          {/* Order Summary */}
          {orderSummary && (
            <div className={styles.orderSummary}>
              <h2>Order Summary</h2>
              
              {/* Vendor Groups */}
              {orderSummary.vendor_groups.map(vendor => (
                <div key={vendor.vendor_id} className={styles.vendorGroup}>
                  <h3 className={styles.vendorName}>
                    Sold by: {vendor.vendor_name}
                  </h3>
                  
                  {vendor.items.map(item => (
                    <div key={item.product_id} className={styles.orderItem}>
                      <div className={styles.itemDetails}>
                        <span className={styles.itemName}>{item.title}</span>
                        <span className={styles.itemQuantity}>Qty: {item.quantity}</span>
                      </div>
                      <span className={styles.itemPrice}>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  <div className={styles.vendorSubtotal}>
                    Subtotal: ${vendor.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
              
              {/* Order Totals */}
              <div className={styles.orderTotals}>
                <div className={styles.totalLine}>
                  <span>Subtotal:</span>
                  <span>${orderSummary.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className={styles.totalLine}>
                  <span>Shipping:</span>
                  <span>${orderSummary.totals.shipping_total.toFixed(2)}</span>
                </div>
                <div className={styles.totalLine}>
                  <span>Platform Fee:</span>
                  <span>${orderSummary.totals.platform_fee_total.toFixed(2)}</span>
                </div>
                <div className={styles.totalLine + ' ' + styles.grandTotal}>
                  <span>Total:</span>
                  <span>${orderSummary.totals.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Payment Section */}
          <div className={styles.paymentSection}>
            <h2>Payment</h2>
            
            {/* Test Card Reference */}
            <div className={styles.testCards}>
              <h3>Test Card Numbers:</h3>
              {testCards.map((card, index) => (
                <div key={index} className={styles.testCard}>
                  <code>{card.number}</code> - {card.type}
                </div>
              ))}
              <p className={styles.testNote}>
                Use any future expiry date (12/34), any CVC (123), any ZIP (12345)
              </p>
            </div>
            
            {/* Payment Intent Creation */}
            {!paymentIntent && (
              <div className={styles.paymentStep}>
                <button 
                  onClick={createPaymentIntent}
                  disabled={processing}
                  className={styles.createIntentButton}
                >
                  {processing ? 'Creating...' : 'Create Payment Intent'}
                </button>
              </div>
            )}
            
            {/* Payment Intent Details */}
            {paymentIntent && (
              <div className={styles.paymentIntent}>
                <h3>✅ Payment Intent Created</h3>
                <div className={styles.intentDetails}>
                  <p><strong>Intent ID:</strong> {paymentIntent.payment_intent.id}</p>
                  <p><strong>Amount:</strong> ${(paymentIntent.payment_intent.amount / 100).toFixed(2)}</p>
                  <p><strong>Order ID:</strong> {paymentIntent.order_id}</p>
                </div>
                
                {/* Test Payment Buttons */}
                <div className={styles.testPayments}>
                  <h4>Simulate Payment:</h4>
                  {testCards.map((card, index) => (
                    <button
                      key={index}
                      onClick={() => simulatePayment(card.type)}
                      disabled={processing}
                      className={`${styles.testPaymentButton} ${
                        card.type.includes('Success') ? styles.successButton : styles.errorButton
                      }`}
                    >
                      Pay with {card.type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Payment Status */}
            {paymentStatus && (
              <div className={styles.paymentStatus}>
                <p>{paymentStatus}</p>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className={styles.error}>
                <p>{error}</p>
              </div>
            )}
          </div>
          
          {/* Back to Cart */}
          <div className={styles.actions}>
            <button 
              onClick={() => router.push('/cart')} 
              className={styles.backButton}
              disabled={processing}
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 
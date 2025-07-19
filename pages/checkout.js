import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import Header from '../components/Header';
import { authenticatedApiRequest, handleCsrfError } from '../lib/csrf';
import styles from '../styles/Checkout.module.css';

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const router = useRouter();

  // Initialize Stripe when script loads
  const initializeStripe = async () => {
    if (typeof window !== 'undefined' && window.Stripe) {
      const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      setStripeLoaded(true);
    }
  };

  useEffect(() => {
    // Get cart data from localStorage
    const cartData = localStorage.getItem('checkoutCart');
    if (cartData) {
      const items = JSON.parse(cartData);
      setCartItems(items);
      calculateOrderTotals(items);
    } else {
      router.push('/cart');
    }
  }, []);

  useEffect(() => {
    // Initialize Stripe Elements when stripe is loaded and we have a payment intent
    if (stripeLoaded && stripe && paymentIntent && !elements) {
      const elementsInstance = stripe.elements({
        clientSecret: paymentIntent.payment_intent.client_secret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2c5aa0',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          }
        }
      });

      const cardElementInstance = elementsInstance.create('payment', {
        layout: 'tabs'
      });

      setElements(elementsInstance);
      setCardElement(cardElementInstance);

      // Mount the payment element
      setTimeout(() => {
        const paymentElementContainer = document.getElementById('payment-element');
        if (paymentElementContainer) {
          cardElementInstance.mount('#payment-element');
        }
      }, 100);
    }
  }, [stripeLoaded, stripe, paymentIntent, elements]);

  const calculateOrderTotals = async (items) => {
    try {
      const cart_items = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/checkout/calculate-totals', {
        method: 'POST',
        headers: {
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
      handleCsrfError(err);
      setError(err.message || 'Failed to calculate order totals');
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const cart_items = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/checkout/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cart_items })
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentIntent(data);
        setPaymentStatus('Payment form ready');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create payment intent');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      handleCsrfError(err);
      setError(err.message || 'Failed to create payment intent');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !cardElement) {
      setError('Stripe has not loaded yet');
      return;
    }

    setProcessing(true);
    setError(null);
    setPaymentStatus('Processing payment...');

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: billingDetails
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        setError(stripeError.message);
        setPaymentStatus('Payment failed');
        setProcessing(false);
        return;
      }

      if (confirmedPaymentIntent.status === 'succeeded') {
        // Payment succeeded, confirm with backend
        const confirmResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/checkout/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payment_intent_id: confirmedPaymentIntent.id,
            order_id: paymentIntent.order_id
          })
        });

        if (confirmResponse.ok) {
          setPaymentStatus('✅ Payment successful! Order confirmed.');
          localStorage.removeItem('checkoutCart');
          
          setTimeout(() => {
            router.push('/dashboard?tab=orders');
          }, 2000);
        } else {
          const errorData = await confirmResponse.json();
          setError(`Payment processed but order confirmation failed: ${errorData.error}`);
        }
      } else {
        setError('Payment was not completed successfully');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleBillingDetailsChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [field]: value
      }));
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
      
      <Script 
        src="https://js.stripe.com/v3/" 
        onLoad={initializeStripe}
      />
      
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
            
            {/* Payment Intent Creation */}
            {!paymentIntent && (
              <div className={styles.paymentStep}>
                <button 
                  onClick={createPaymentIntent}
                  disabled={processing}
                  className={styles.createIntentButton}
                >
                  {processing ? 'Setting up payment...' : 'Continue to Payment'}
                </button>
              </div>
            )}
            
            {/* Payment Form */}
            {paymentIntent && stripeLoaded && (
              <div className={styles.paymentForm}>
                <form onSubmit={handlePayment}>
                  {/* Billing Details */}
                  <div className={styles.billingDetails}>
                    <h3>Billing Information</h3>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="billing-name">Full Name</label>
                        <input
                          id="billing-name"
                          type="text"
                          value={billingDetails.name}
                          onChange={(e) => handleBillingDetailsChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="billing-email">Email</label>
                        <input
                          id="billing-email"
                          type="email"
                          value={billingDetails.email}
                          onChange={(e) => handleBillingDetailsChange('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="billing-address">Address</label>
                      <input
                        id="billing-address"
                        type="text"
                        value={billingDetails.address.line1}
                        onChange={(e) => handleBillingDetailsChange('address.line1', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label htmlFor="billing-address2">Apartment, suite, etc. (optional)</label>
                      <input
                        id="billing-address2"
                        type="text"
                        value={billingDetails.address.line2}
                        onChange={(e) => handleBillingDetailsChange('address.line2', e.target.value)}
                      />
                    </div>
                    
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="billing-city">City</label>
                        <input
                          id="billing-city"
                          type="text"
                          value={billingDetails.address.city}
                          onChange={(e) => handleBillingDetailsChange('address.city', e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="billing-state">State</label>
                        <input
                          id="billing-state"
                          type="text"
                          value={billingDetails.address.state}
                          onChange={(e) => handleBillingDetailsChange('address.state', e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label htmlFor="billing-zip">ZIP Code</label>
                        <input
                          id="billing-zip"
                          type="text"
                          value={billingDetails.address.postal_code}
                          onChange={(e) => handleBillingDetailsChange('address.postal_code', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stripe Payment Element */}
                  <div className={styles.paymentElement}>
                    <h3>Payment Method</h3>
                    <div id="payment-element">
                      {!stripeLoaded && <div className={styles.loadingSpinner}>Loading payment form...</div>}
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={processing || !stripeLoaded}
                    className={styles.payButton}
                  >
                    {processing ? 'Processing...' : `Pay $${orderSummary?.totals?.total_amount?.toFixed(2) || '0.00'}`}
                  </button>
                </form>
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
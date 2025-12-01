import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../../lib/csrf';
import { authApiRequest } from '../../lib/apiUtils';
import styles from '../../styles/CheckoutSuccess.module.css';

export default function CheckoutSuccess() {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { payment_intent, order_id } = router.query;

  useEffect(() => {
    if (payment_intent) {
      handlePaymentSuccess();
    }
  }, [payment_intent]);

  const handlePaymentSuccess = async () => {
    try {
      if (!payment_intent || !order_id) {
        setError('Missing payment information');
        return;
      }

      // Confirm the payment with our backend
      const response = await authApiRequest('checkout/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_intent_id: payment_intent,
          order_id: order_id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOrderData(data);
        
        // Clear cart from localStorage
        localStorage.removeItem('checkoutCart');
        
        // Auto-redirect to dashboard after 10 seconds
        setTimeout(() => {
          router.push('/dashboard?tab=orders');
        }, 10000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to confirm payment');
      }
    } catch (err) {
      console.error('Payment confirmation error:', err);
      setError('Payment confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <h2>Confirming your payment...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Payment Confirmation Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/dashboard')} className={styles.button}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Payment Success - Online Art Festival</title>
      </Head>
      
      <div className={styles.container}>
        <div className={styles.success}>
          <div className={styles.successIcon}>✅</div>
          <h1>Payment Successful!</h1>
          <p className={styles.successMessage}>
            Thank you for your purchase! Your order has been confirmed and you will receive 
            a confirmation email shortly.
          </p>
          
          {orderData && (
            <div className={styles.orderDetails}>
              <h2>Order Details</h2>
              <div className={styles.orderInfo}>
                <p><strong>Order ID:</strong> {orderData.order_id}</p>
                <p><strong>Payment Intent:</strong> {payment_intent}</p>
              </div>
            </div>
          )}
          
          <div className={styles.actions}>
            <button 
              onClick={() => router.push('/dashboard?tab=orders')}
              className={styles.primaryButton}
            >
              View My Orders
            </button>
            <button 
              onClick={() => router.push('/')}
              className={styles.secondaryButton}
            >
              Continue Shopping
            </button>
          </div>
          
          <div className={styles.autoRedirect}>
            <p>You will be automatically redirected to your dashboard in 10 seconds...</p>
          </div>
        </div>
      </div>
    </>
  );
} 
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import { authenticatedApiRequest, handleCsrfError } from '../../lib/csrf';
import { authApiRequest } from '../../lib/apiUtils';
import styles from '../../styles/EventPayment.module.css';

export default function EventPayment() {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
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
  const { payment_intent_id } = router.query;

  // Initialize Stripe when script loads
  const initializeStripe = async () => {
    if (typeof window !== 'undefined' && window.Stripe) {
      const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      setStripeLoaded(true);
    }
  };

  useEffect(() => {
    if (payment_intent_id) {
      loadPaymentData();
    }
  }, [payment_intent_id]);

  // Load payment data from backend
  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get payment intent and application details
      const response = await authApiRequest(`api/applications/payment-intent/${payment_intent_id}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
        
        // Pre-fill billing details if available
        if (data.artist_email) {
          setBillingDetails(prev => ({
            ...prev,
            email: data.artist_email,
            name: `${data.artist_first_name} ${data.artist_last_name}`
          }));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Payment not found');
      }
    } catch (err) {
      console.error('Error loading payment data:', err);
      handleCsrfError(err);
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  // Setup Stripe Elements when stripe is loaded and payment data is available
  useEffect(() => {
    if (stripe && paymentData && !elements) {
      const elementsInstance = stripe.elements({
        clientSecret: paymentData.client_secret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2c3e50',
            colorBackground: '#ffffff',
            colorText: '#2c3e50',
            colorDanger: '#e74c3c',
            spacingUnit: '6px',
            borderRadius: '8px'
          }
        }
      });

      setElements(elementsInstance);
      
      // Create card element
      const cardElementInstance = elementsInstance.create('card', {
        style: {
          base: {
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            '::placeholder': {
              color: '#6c757d'
            }
          }
        }
      });

      setCardElement(cardElementInstance);
    }
  }, [stripe, paymentData, elements]);

  // Mount card element when available
  useEffect(() => {
    if (cardElement) {
      cardElement.mount('#card-element');
    }
  }, [cardElement]);

  const handleBillingDetailsChange = (field, value) => {
    setBillingDetails(prev => {
      const newDetails = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        newDetails[parent][child] = value;
      } else {
        newDetails[field] = value;
      }
      return newDetails;
    });
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !cardElement) {
      setError('Payment system not ready');
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
          return_url: `${window.location.origin}/event-payment/success?payment_intent=${payment_intent_id}`,
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
        // Payment succeeded, redirect to success page
        router.push(`/event-payment/success?payment_intent=${payment_intent_id}`);
      } else {
        setError('Payment was not completed successfully');
        setPaymentStatus('Payment failed');
        setProcessing(false);
      }

    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err.message || 'Payment processing failed');
      setPaymentStatus('Payment failed');
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.error}>
            <h2>Payment Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className={styles.backButton}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Event Booth Fee Payment - {paymentData?.event_title}</title>
        <meta name="description" content="Complete your booth fee payment to confirm your participation in the event" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Script
        src="https://js.stripe.com/v3/"
        onLoad={initializeStripe}
        strategy="lazyOnload"
      />


      <div className={styles.paymentContainer}>
        <div className={styles.paymentHeader}>
          <div className={styles.eventBanner}>
            <h1>🎪 {paymentData?.event_title}</h1>
            <p className={styles.eventDetails}>
              {formatDate(paymentData?.event_start_date)} - {formatDate(paymentData?.event_end_date)}
            </p>
            <p className={styles.eventLocation}>
              📍 {paymentData?.event_venue_name}, {paymentData?.event_venue_city}, {paymentData?.event_venue_state}
            </p>
          </div>
        </div>

        <div className={styles.paymentContent}>
          {/* Payment Summary */}
          <div className={styles.paymentSummary}>
            <div className={styles.summaryCard}>
              <h2>Booth Fee Payment</h2>
              <div className={styles.summaryDetails}>
                <div className={styles.summaryLine}>
                  <span>Artist:</span>
                  <span>{paymentData?.artist_first_name} {paymentData?.artist_last_name}</span>
                </div>
                <div className={styles.summaryLine}>
                  <span>Booth Fee:</span>
                  <span>{formatCurrency(paymentData?.booth_fee_amount || 0)}</span>
                </div>
                {paymentData?.addons_total > 0 && (
                  <div className={styles.summaryLine}>
                    <span>Add-ons:</span>
                    <span>{formatCurrency(paymentData?.addons_total || 0)}</span>
                  </div>
                )}
                <div className={styles.summaryLine + ' ' + styles.totalLine}>
                  <span>Total Due:</span>
                  <span>{formatCurrency(paymentData?.total_amount || 0)}</span>
                </div>
                <div className={styles.summaryLine + ' ' + styles.dueDateLine}>
                  <span>Due Date:</span>
                  <span>{formatDate(paymentData?.due_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className={styles.paymentForm}>
            <h2>Payment Details</h2>
            
            {paymentStatus && (
              <div className={styles.paymentStatus}>
                {paymentStatus}
              </div>
            )}

            {error && (
              <div className={styles.formError}>
                {error}
              </div>
            )}

            <form onSubmit={handlePayment}>
              {/* Billing Details */}
              <div className={styles.billingSection}>
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
                      className={styles.formInput}
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
                      className={styles.formInput}
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
                    className={styles.formInput}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="billing-address2">Apartment, suite, etc. (optional)</label>
                  <input
                    id="billing-address2"
                    type="text"
                    value={billingDetails.address.line2}
                    onChange={(e) => handleBillingDetailsChange('address.line2', e.target.value)}
                    className={styles.formInput}
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
                      className={styles.formInput}
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
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="billing-postal">ZIP Code</label>
                    <input
                      id="billing-postal"
                      type="text"
                      value={billingDetails.address.postal_code}
                      onChange={(e) => handleBillingDetailsChange('address.postal_code', e.target.value)}
                      required
                      className={styles.formInput}
                    />
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className={styles.cardSection}>
                <h3>Card Information</h3>
                <div className={styles.cardElementContainer}>
                  <div id="card-element" className={styles.cardElement}>
                    {/* Stripe Elements will mount here */}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className={styles.submitSection}>
                <button
                  type="submit"
                  disabled={processing || !stripeLoaded}
                  className={styles.payButton}
                >
                  {processing ? (
                    <>
                      <span className={styles.spinner}></span>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      💳 Pay {formatCurrency(paymentData?.total_amount || 0)}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.paymentFooter}>
          <div className={styles.securityBadges}>
            <span>🔒 Secure Payment</span>
            <span>💳 Powered by Stripe</span>
            <span>🛡️ SSL Encrypted</span>
          </div>
          <p className={styles.termsText}>
            By completing this payment, you confirm your participation in {paymentData?.event_title} and agree to the event terms and conditions.
          </p>
        </div>
      </div>
    </div>
  );
} 
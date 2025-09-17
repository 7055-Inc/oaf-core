// Reusable Stripe Card Setup Component
// Handles secure card collection for setup intents (saving cards on file)

import { useState, useEffect } from 'react';

export default function StripeCardSetup({ 
  setupIntent, 
  onSuccess, 
  onError, 
  processing, 
  setProcessing 
}) {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Initialize Stripe when script loads
  useEffect(() => {
    const initializeStripe = () => {
      if (typeof window !== 'undefined' && window.Stripe) {
        const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        setStripe(stripeInstance);
        setStripeLoaded(true);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      // Check if Stripe is already loaded
      if (window.Stripe) {
        initializeStripe();
      } else {
        // Wait for Stripe to load
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = initializeStripe;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Setup Stripe Elements when stripe is loaded and we have setup intent
  useEffect(() => {
    if (stripeLoaded && stripe && setupIntent && !elements) {
      const elementsInstance = stripe.elements({
        clientSecret: setupIntent.client_secret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#007cba',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px',
          }
        }
      });

      setElements(elementsInstance);
      
      // Create card element
      const cardElementInstance = elementsInstance.create('card', {
        style: {
          base: {
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif',
            '::placeholder': { color: '#6c757d' }
          }
        }
      });

      // Listen for card changes
      cardElementInstance.on('change', (event) => {
        setCardError(event.error ? event.error.message : null);
        setCardComplete(event.complete);
      });

      setCardElement(cardElementInstance);
    }
  }, [stripeLoaded, stripe, setupIntent?.client_secret]);

  // Mount card element when available
  useEffect(() => {
    if (cardElement && document.getElementById('card-setup-element')) {
      cardElement.mount('#card-setup-element');
    }
  }, [cardElement]);

  const handleSetupSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !cardElement) {
      onError('Stripe not loaded properly');
      return;
    }

    // Check if setup intent is already succeeded
    if (setupIntent.status === 'succeeded') {
      onSuccess(setupIntent);
      return;
    }

    if (!cardComplete) {
      onError('Please enter complete card information');
      return;
    }

    setProcessing(true);
    setCardError(null);

    try {
      // Confirm the setup intent
      const { error, setupIntent: confirmedSetupIntent } = await stripe.confirmCardSetup(
        setupIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Shipping Subscription' // Could make this dynamic
            }
          }
        }
      );

      if (error) {
        console.error('Setup error:', error);
        onError(error.message);
      } else if (confirmedSetupIntent.status === 'succeeded') {
        onSuccess(confirmedSetupIntent);
      } else {
        onError('Setup failed with status: ' + confirmedSetupIntent.status);
      }
    } catch (err) {
      console.error('Setup exception:', err);
      onError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  if (!setupIntent) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>Initializing payment method setup...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ marginBottom: '10px' }}>Add Payment Method</h4>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
        Your card will be securely stored for shipping label purchases. You will not be charged now.
      </p>
      
      <form onSubmit={handleSetupSubmit}>
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px', 
          border: '1px solid #ddd', 
          borderRadius: '6px',
          backgroundColor: '#fafafa'
        }}>
          <div id="card-setup-element" style={{ minHeight: '40px' }}>
            {!stripeLoaded && (
              <div style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                Loading secure card input...
              </div>
            )}
          </div>
        </div>

        {cardError && (
          <div style={{ 
            color: '#df1b41', 
            fontSize: '14px', 
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: '#fdf2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px'
          }}>
            {cardError}
          </div>
        )}

        <button 
          type="submit" 
          disabled={processing || !cardComplete}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: processing || !cardComplete ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: processing || !cardComplete ? 'not-allowed' : 'pointer',
            width: '100%',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {processing ? 'Setting up...' : 'Save Payment Method'}
        </button>
      </form>

      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '10px',
        textAlign: 'center'
      }}>
        🔒 Your payment information is encrypted and secure
      </div>
    </div>
  );
}

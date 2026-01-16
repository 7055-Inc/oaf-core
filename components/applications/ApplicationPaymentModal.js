import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';

export default function ApplicationPaymentModal({ application, event, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);

  // Load Stripe
  useEffect(() => {
    if (window.Stripe) {
      setStripe(window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY));
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => setStripe(window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY));
      document.head.appendChild(script);
    }
  }, []);

  // Create payment intent
  useEffect(() => {
    if (!application?.id) return;
    
    const createIntent = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(getApiUrl(`api/applications/${application.id}/create-payment-intent`), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setClientSecret(data.client_secret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [application?.id]);

  // Initialize Stripe Elements
  useEffect(() => {
    if (!stripe || !clientSecret) return;
    const els = stripe.elements({ clientSecret });
    const paymentEl = els.create('payment');
    paymentEl.mount('#payment-element');
    setElements(els);
  }, [stripe, clientSecret]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required'
      });

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent.status === 'succeeded') {
        const token = localStorage.getItem('token');
        const res = await fetch(getApiUrl(`api/applications/${application.id}/confirm-payment`), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentIntent.id })
        });
        if (!res.ok) throw new Error('Failed to confirm payment');
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalFees = (parseFloat(event?.application_fee) || 0) + (parseFloat(event?.jury_fee) || 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onCancel}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '8px', maxWidth: '450px',
        width: '90%', maxHeight: '90vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0 }}>Complete Payment</h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
            <strong>{event?.title}</strong>
            <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
              {event?.application_fee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Application Fee:</span>
                  <span>${parseFloat(event.application_fee).toFixed(2)}</span>
                </div>
              )}
              {event?.jury_fee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Jury Fee:</span>
                  <span>${parseFloat(event.jury_fee).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <span>Total:</span>
                <span>${totalFees.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading payment form...</div>
          ) : error && !clientSecret ? (
            <div style={{ color: '#dc2626', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>{error}</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div id="payment-element" style={{ marginBottom: '20px' }}></div>
              
              {error && (
                <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={onCancel} disabled={processing}
                  style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer' }}>
                  Save as Draft
                </button>
                <button type="submit" disabled={processing || !stripe}
                  style={{ flex: 2, padding: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#055474', color: '#fff', cursor: 'pointer' }}>
                  {processing ? 'Processing...' : `Pay $${totalFees.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


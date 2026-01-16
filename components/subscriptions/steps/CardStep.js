// Reusable Card on File Step Component
// Checks for existing valid card, auto-skips if found, otherwise collects card

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../lib/apiUtils';
import StripeCardSetup from '../../stripe/StripeCardSetup';

export default function CardStep({ 
  subscriptionType,
  config,
  onComplete 
}) {
  const [loading, setLoading] = useState(true);
  const [hasCard, setHasCard] = useState(false);
  const [cardInfo, setCardInfo] = useState(null);
  const [setupIntent, setSetupIntent] = useState(null);
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkPaymentMethod();
  }, []);

  const checkPaymentMethod = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authApiRequest(`api/subscriptions/${subscriptionType}/my`);
      const data = await handleApiResponse(response);
      
      if (data.subscription?.stripe_customer_id) {
        const cardResponse = await authApiRequest('api/users/payment-methods');
        const cardData = await handleApiResponse(cardResponse);
        
        if (cardData.success && cardData.paymentMethods && cardData.paymentMethods.length > 0) {
          const card = cardData.paymentMethods[0];
          setCardInfo({
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year
          });
          setHasCard(true);
          
          setTimeout(() => {
            onComplete();
          }, 800);
          
          setLoading(false);
          return;
        }
      }
      
      await createSetupIntent();
      
    } catch (err) {
      console.error('Error checking payment method:', err);
      await createSetupIntent();
    }
  };

  const createSetupIntent = async () => {
    try {
      const response = await authApiRequest('api/payment-methods/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_type: subscriptionType })
      });
      
      const data = await handleApiResponse(response);
      
      if (data.success && data.setupIntent) {
        setSetupIntent(data.setupIntent);
        setShowCardSetup(true);
      } else {
        setError(data.error || 'Failed to initialize payment setup');
      }
    } catch (err) {
      console.error('Error creating setup intent:', err);
      setError(err.message || 'Failed to initialize payment setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSetupSuccess = async (confirmedSetupIntent) => {
    try {
      const response = await authApiRequest('api/payment-methods/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_intent_id: confirmedSetupIntent.id,
          subscription_type: subscriptionType
        })
      });
      
      const data = await handleApiResponse(response);
      
      if (data.success) {
        setHasCard(true);
        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        setError(data.error || 'Failed to save payment method');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Error confirming card setup:', err);
      setError(err.message || 'Failed to save payment method. Please try again.');
      setProcessing(false);
    }
  };

  const handleCardSetupError = (errorMessage) => {
    setError(errorMessage);
    setProcessing(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        <span>Checking payment methods...</span>
      </div>
    );
  }

  // Has valid card - showing transition
  if (hasCard && !showCardSetup) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="success-alert" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ marginBottom: '10px' }}>Payment Method on File</h2>
          {cardInfo && (
            <p style={{ marginBottom: '10px' }}>
              {cardInfo.brand.charAt(0).toUpperCase() + cardInfo.brand.slice(1)} ending in {cardInfo.last4}
            </p>
          )}
          <p style={{ fontSize: '14px' }}>Continuing to next step...</p>
        </div>
      </div>
    );
  }

  // Show card setup form
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>Add Payment Method</h2>
        <p style={{ color: '#6c757d' }}>
          Save a card on file for {config.displayName || 'your subscription'}
        </p>
      </div>

      {/* Info Box */}
      <div className="form-card">
        <strong>Why we need a payment method:</strong>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
          {config.paymentReason 
            ? config.paymentReason
            : config.billingType === 'pay_as_you_go' 
              ? 'Your card will be charged only when you create shipping labels. No monthly fees or commitments.'
              : 'Your card will be charged for your subscription and used for automatic renewals.'
          }
        </p>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '13px' }}>
          🔒 Your payment information is securely stored by Stripe and never touches our servers.
        </p>
      </div>

      {/* Error Message */}
      {error && <div className="error-alert">{error}</div>}

      {/* Stripe Card Setup Component */}
      {showCardSetup && (
        <div className="form-card">
          <StripeCardSetup
            setupIntent={setupIntent}
            onSuccess={handleCardSetupSuccess}
            onError={handleCardSetupError}
            processing={processing}
            setProcessing={setProcessing}
          />
        </div>
      )}
    </div>
  );
}

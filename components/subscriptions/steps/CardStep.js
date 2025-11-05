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
      // Check if user has a valid payment method via subscription status
      const response = await authApiRequest(`api/subscriptions/${subscriptionType}/my`);
      const data = await handleApiResponse(response);
      
      // Check if user has a card on file
      if (data.subscription?.stripe_customer_id) {
        // User has a Stripe customer ID, check for payment methods
        const cardResponse = await authApiRequest('api/users/payment-methods');
        const cardData = await handleApiResponse(cardResponse);
        
        if (cardData.success && cardData.paymentMethods && cardData.paymentMethods.length > 0) {
          // User has valid card on file
          const card = cardData.paymentMethods[0];
          setCardInfo({
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year
          });
          setHasCard(true);
          
          // Auto-skip after brief display
          setTimeout(() => {
            onComplete();
          }, 800);
          
          setLoading(false);
          return;
        }
      }
      
      // No card found - need to create setup intent
      await createSetupIntent();
      
    } catch (err) {
      console.error('Error checking payment method:', err);
      // Even on error, try to create setup intent
      await createSetupIntent();
    }
  };

  const createSetupIntent = async () => {
    try {
      const response = await authApiRequest('api/payment-methods/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_type: subscriptionType
        })
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
      // Confirm with backend that card was saved
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
        // Card saved successfully
        setHasCard(true);
        
        // Brief success display then move to next step
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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>
          Checking payment methods...
        </div>
      </div>
    );
  }

  // Has valid card - showing transition
  if (hasCard && !showCardSetup) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          background: '#d4edda', 
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ color: '#155724', marginBottom: '10px' }}>
            Payment Method on File
          </h2>
          {cardInfo && (
            <p style={{ color: '#155724', marginBottom: '10px' }}>
              {cardInfo.brand.charAt(0).toUpperCase() + cardInfo.brand.slice(1)} ending in {cardInfo.last4}
            </p>
          )}
          <p style={{ color: '#155724', fontSize: '14px' }}>
            Continuing to next step...
          </p>
        </div>
      </div>
    );
  }

  // Show card setup form
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>
          Add Payment Method
        </h2>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Save a card on file for {config.displayName}
        </p>
      </div>

      {/* Info Box */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '24px',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        <strong>Why we need a payment method:</strong>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
          {config.billingType === 'pay_as_you_go' 
            ? 'Your card will be charged only when you create shipping labels. No monthly fees or commitments.'
            : 'Your card will be charged for your subscription and used for automatic renewals.'
          }
        </p>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '13px' }}>
          🔒 Your payment information is securely stored by Stripe and never touches our servers.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          padding: '12px', 
          marginBottom: '20px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: '4px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {/* Stripe Card Setup Component */}
      {showCardSetup && (
        <div style={{
          background: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
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


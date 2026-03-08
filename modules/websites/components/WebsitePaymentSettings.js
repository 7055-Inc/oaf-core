/**
 * Websites > Payment Settings – Card on file for website subscription.
 * Uses v2 subscription/my for cardLast4; v2 commerce/payment-methods for full card display; StripeCardSetup for add/update.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest, handleApiResponse } from '../../../lib/apiUtils';
import StripeCardSetup from '../../../components/stripe/StripeCardSetup';
import { fetchWebsitesSubscription } from '../../../lib/websites/api';

const SUBSCRIPTION_TYPE = 'websites';

export default function WebsitePaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [cardInfo, setCardInfo] = useState(null);
  const [setupIntent, setSetupIntent] = useState(null);
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkPaymentMethod();
  }, []);

  const checkPaymentMethod = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWebsitesSubscription();
      if (data.subscription?.cardLast4) {
        try {
          const cardResponse = await authApiRequest('api/v2/commerce/payment-methods');
          if (cardResponse.ok) {
            const cardData = await cardResponse.json();
            const methods = cardData.data?.paymentMethods || cardData.paymentMethods;
            if (cardData.success && methods?.length > 0) {
              const card = methods[0];
              setCardInfo({ brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year });
            } else {
              setCardInfo({ brand: 'card', last4: data.subscription.cardLast4 });
            }
          } else {
            setCardInfo({ brand: 'card', last4: data.subscription.cardLast4 });
          }
        } catch {
          setCardInfo({ brand: 'card', last4: data.subscription.cardLast4 });
        }
      }
      const intentResponse = await authApiRequest('api/v2/commerce/payment-methods/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_type: SUBSCRIPTION_TYPE })
      });
      const intentData = await intentResponse.json();
      const intentPayload = intentData.data || intentData;
      if (intentResponse.ok && intentData.success && intentPayload.setupIntent) {
        setSetupIntent(intentPayload.setupIntent);
        setShowCardSetup(true);
      } else if (!intentResponse.ok) {
        setError(intentData.error || intentData.message || 'Could not load payment form.');
      }
    } catch (err) {
      console.error('Payment settings load error:', err);
      setError(err.message || 'Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSuccess = async (confirmedSetupIntent) => {
    try {
      setProcessing(true);
      setError('');
      const response = await authApiRequest('api/v2/commerce/payment-methods/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_intent_id: confirmedSetupIntent.id,
          subscription_type: SUBSCRIPTION_TYPE
        })
      });
      const data = await handleApiResponse(response);
      if (data.success) {
        setSuccess('Payment method saved. You can add or update again below.');
        await checkPaymentMethod();
      } else {
        setError(data.error || 'Failed to save payment method.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardError = (msg) => {
    setError(msg);
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading payment settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="form-card">
        <h3>Payment method for website subscription</h3>
        <p className="form-help" style={{ marginBottom: '16px' }}>
          This card is used for your website subscription. You can add or update it below.
        </p>
        {cardInfo && (
          <div className="status-indicator connected" style={{ marginBottom: '16px' }}>
            <i className="fa-solid fa-credit-card" />
            <span>
              {cardInfo.brand?.charAt(0).toUpperCase()}{cardInfo.brand?.slice(1)} ending in {cardInfo.last4}
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      {showCardSetup && setupIntent && (
        <div className="form-card">
          <h4 style={{ marginBottom: '8px' }}>Add or update card</h4>
          <p className="form-help" style={{ marginBottom: '16px' }}>
            Your card is securely stored by Stripe. You will not be charged until your subscription is active.
          </p>
          <StripeCardSetup
            setupIntent={setupIntent}
            onSuccess={handleCardSuccess}
            onError={handleCardError}
            processing={processing}
            setProcessing={setProcessing}
          />
        </div>
      )}
    </div>
  );
}

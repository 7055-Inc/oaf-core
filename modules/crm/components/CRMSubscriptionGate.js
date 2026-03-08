/**
 * Gate for all CRM pages: if user has not completed CRM subscription
 * (tier, terms, card), show the tier/terms/card flow in place. If complete, show the page.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import ChecklistController from '../../../components/subscriptions/ChecklistController';
import { getCRMSubscriptionConfig } from './crmSubscriptionConfig';

const SUBSCRIPTION_TYPE = 'crm';
const CRM_CONFIG = getCRMSubscriptionConfig(() => null);
const SUBSCRIPTION_MY_URL = CRM_CONFIG.subscriptionApiBase
  ? `${CRM_CONFIG.subscriptionApiBase}/subscription/my`
  : `api/subscriptions/${SUBSCRIPTION_TYPE}/my`;

function checkTier(data) {
  return data?.subscription?.tier != null;
}

function checkTerms(data) {
  return data?.subscription?.termsAccepted === true;
}

function checkCard(data) {
  // Free tier doesn't need a card
  if (data?.subscription?.tier === 'free') {
    return true;
  }
  return data?.subscription?.cardLast4 != null;
}

export default function CRMSubscriptionGate({ userData, children }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [checkState, setCheckState] = useState({
    tier: false,
    terms: false,
    card: false
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const response = await authApiRequest(SUBSCRIPTION_MY_URL);
        if (cancelled) return;
        const data = response.ok ? await response.json() : null;
        if (cancelled) return;
        if (data && typeof data.subscription === 'object') {
          setSubscriptionData(data);
          setCheckState({
            tier: checkTier(data),
            terms: checkTerms(data),
            card: checkCard(data)
          });
        } else {
          setSubscriptionData(null);
          setCheckState({ tier: false, terms: false, card: false });
        }
      } catch (err) {
        if (!cancelled) {
          setSubscriptionData(null);
          setCheckState({ tier: false, terms: false, card: false });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  const subscriptionComplete = checkState.tier && checkState.terms && checkState.card;

  if (subscriptionComplete) {
    return React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, { userData, subscriptionData })
        : child
    );
  }

  const config = getCRMSubscriptionConfig((props) =>
    React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            userData: props.userData ?? userData,
            subscriptionData: props.subscriptionData ?? subscriptionData
          })
        : child
    )
  );

  return (
    <ChecklistController
      subscriptionType={SUBSCRIPTION_TYPE}
      userData={userData}
      config={config}
    />
  );
}

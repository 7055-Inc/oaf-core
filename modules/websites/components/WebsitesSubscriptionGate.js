/**
 * Gate for all website menu pages: if user has not completed website subscription
 * (tier, terms, card), show the tier/terms/card flow in place. If complete, show the page.
 * Build once – same flow for My Sites, Payment Settings, Add Site, Manage, etc.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import ChecklistController from '../../../components/subscriptions/ChecklistController';
import { getWebsitesSubscriptionConfig } from './websitesSubscriptionConfig';

const SUBSCRIPTION_TYPE = 'websites';
const WEBSITES_CONFIG = getWebsitesSubscriptionConfig(() => null);
const SUBSCRIPTION_MY_URL = WEBSITES_CONFIG.subscriptionApiBase
  ? `${WEBSITES_CONFIG.subscriptionApiBase}/subscription/my`
  : `api/subscriptions/${SUBSCRIPTION_TYPE}/my`;

function checkTier(data) {
  return data?.subscription?.tier != null;
}

function checkTerms(data) {
  return data?.subscription?.termsAccepted === true;
}

function checkCard(data) {
  return data?.subscription?.cardLast4 != null;
}

export default function WebsitesSubscriptionGate({ userData, children }) {
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

  const config = getWebsitesSubscriptionConfig((props) =>
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

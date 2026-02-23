/**
 * Gate for connector addon pages: if the user hasn't completed the addon
 * subscription flow (tier, terms, card), show the ChecklistController flow.
 * Once complete, render the actual connector UI.
 *
 * Follows the same pattern as WebsitesSubscriptionGate.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import ChecklistController from '../../../components/subscriptions/ChecklistController';
import { getConnectorSubscriptionConfig } from './connectorSubscriptionConfig';

function checkTier(data) {
  return data?.subscription?.tier != null;
}

function checkTerms(data) {
  return data?.subscription?.termsAccepted === true;
}

function checkCard(data) {
  return data?.subscription?.cardLast4 != null;
}

export default function ConnectorSubscriptionGate({ addonSlug, userData, connectorOpts, children }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [checkState, setCheckState] = useState({
    tier: false,
    terms: false,
    card: false
  });

  const subscriptionMyUrl = `api/v2/addons/connectors/${addonSlug}/subscription/my`;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const response = await authApiRequest(subscriptionMyUrl);
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
  }, [addonSlug]);

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

  const config = getConnectorSubscriptionConfig(
    addonSlug,
    connectorOpts,
    (props) =>
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
      subscriptionType="addons"
      userData={userData}
      config={config}
    />
  );
}

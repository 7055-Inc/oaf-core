/**
 * Shipping Labels Subscription Component
 * 
 * Gate component using ChecklistController pattern.
 * Shows onboarding flow if not subscribed, dashboard if subscribed.
 */

import React from 'react';
import ChecklistController from '../../../../components/subscriptions/ChecklistController';
import ShippingLabelsDashboard from './ShippingLabelsDashboard';
import { shippingLabelsConfig } from './shippingLabelsConfig';

export default function ShippingLabelsSubscription({ userData }) {
  // Merge config with dashboard component
  const config = {
    ...shippingLabelsConfig,
    dashboardComponent: ShippingLabelsDashboard
  };

  return (
    <ChecklistController 
      subscriptionType="shipping_labels"
      userData={userData}
      config={config}
    />
  );
}

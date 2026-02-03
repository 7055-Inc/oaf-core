/**
 * Marketplace Subscription Component
 * 
 * Gate component using ChecklistController pattern.
 * - If user has marketplace permission: show MarketplaceDashboard directly
 * - If user doesn't have permission: show application flow via ChecklistController
 */

import React from 'react';
import ChecklistController from '../../../../components/subscriptions/ChecklistController';
import MarketplaceDashboard from './MarketplaceDashboard';
import { marketplaceConfig } from './marketplaceConfig';
import { hasPermission } from '../../../../lib/userUtils';

export default function MarketplaceSubscription({ userData }) {
  // Check if user already has marketplace permission
  const hasMarketplaceAccess = hasPermission(userData, 'marketplace') || hasPermission(userData, 'vendor');

  // If user already has marketplace access, show dashboard directly
  if (hasMarketplaceAccess) {
    return (
      <MarketplaceDashboard 
        subscriptionData={{ subscription: { status: 'active', tier: 'Marketplace Seller' } }}
        userData={userData}
        onUpdate={() => {}}
      />
    );
  }

  // Otherwise, show the application flow via ChecklistController
  const config = {
    ...marketplaceConfig,
    dashboardComponent: MarketplaceDashboard
  };

  return (
    <ChecklistController 
      subscriptionType="verified"  // Uses verified backend (shared with Verified Artist)
      userData={userData}
      config={config}
    />
  );
}

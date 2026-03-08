/**
 * Verified Artist Subscription Component
 * 
 * Gate component using ChecklistController pattern.
 * - If user has verified permission: show VerifiedDashboard directly
 * - If user doesn't have permission: show application flow via ChecklistController
 */

import React from 'react';
import ChecklistController from '../../../../components/subscriptions/ChecklistController';
import VerifiedDashboard from './VerifiedDashboard';
import { verifiedConfig } from './verifiedConfig';
import { hasPermission } from '../../../../lib/userUtils';

export default function VerifiedSubscription({ userData }) {
  // Check if user already has verified permission
  const hasVerifiedAccess = hasPermission(userData, 'verified');

  // If user already has verified access, show dashboard directly
  if (hasVerifiedAccess) {
    return (
      <VerifiedDashboard 
        subscriptionData={{ subscription: { status: 'active', tier: 'Verified Artist' } }}
        userData={userData}
        onUpdate={() => {}}
      />
    );
  }

  // Otherwise, show the application flow via ChecklistController
  const config = {
    ...verifiedConfig,
    dashboardComponent: VerifiedDashboard
  };

  return (
    <ChecklistController 
      subscriptionType="verified"
      userData={userData}
      config={config}
    />
  );
}

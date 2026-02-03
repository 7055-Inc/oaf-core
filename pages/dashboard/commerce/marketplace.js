/**
 * Marketplace Dashboard Page
 * 
 * Artist application and subscription management for marketplace selling.
 * Uses ChecklistController pattern for subscription gate.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { MarketplaceSubscription } from '../../../modules/commerce/components';
import { authApiRequest } from '../../../lib/apiUtils';

export default function MarketplacePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await authApiRequest('users/me', { method: 'GET' });
      if (!response.ok) {
        router.push('/login?redirect=/dashboard/commerce/marketplace');
        return;
      }
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>Marketplace | Dashboard | Brakebee</title>
        </Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell userData={userData}>
        <Head>
          <title>Marketplace | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Marketplace | Dashboard | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Sell on Marketplace</h1>
          <p className="page-description">
            Apply to sell your handmade work on the Brakebee marketplace.
          </p>
        </div>

        <MarketplaceSubscription userData={userData} />
      </div>
    </DashboardShell>
  );
}

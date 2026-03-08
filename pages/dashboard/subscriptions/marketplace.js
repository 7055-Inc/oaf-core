/**
 * Marketplace Subscriptions Page
 * 
 * Marketplace seller subscription management.
 * Uses legacy slide-in component wrapped in page layout.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { MarketplaceSubscription } from '../../../modules/commerce/components/marketplace';
import { getCurrentUser } from '../../../lib/users/api';

export default function MarketplaceSubscriptionsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
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
          <title>Marketplace Subscription | Dashboard | Brakebee</title>
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
          <title>Marketplace Subscription | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Marketplace Subscription | Dashboard | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Marketplace Subscription</h1>
          <p className="page-description">
            Manage your marketplace seller subscription and start selling your products.
          </p>
        </div>

        <div className="card">
          <MarketplaceSubscription userData={userData} />
        </div>
      </div>
    </DashboardShell>
  );
}

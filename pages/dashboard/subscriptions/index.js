/**
 * Subscriptions Dashboard Page
 * 
 * Main page for managing all subscriptions.
 * Replaces old slide-in: manage-subscriptions
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { SubscriptionOverview } from '../../../modules/subscriptions';
import { authApiRequest } from '../../../lib/apiUtils';

export default function SubscriptionsPage() {
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
        router.push('/login?redirect=/dashboard/subscriptions');
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

  // Check access - only artists, promoters, and admins
  const canAccess = userData && 
    ['admin', 'artist', 'promoter'].includes(userData.user_type);

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head>
          <title>Subscriptions | Dashboard | Brakebee</title>
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
          <title>Subscriptions | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell userData={userData}>
        <Head>
          <title>Subscriptions | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-warning">
          Subscriptions are only available for artists, promoters, and admins.
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Subscriptions | Dashboard | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Manage Subscriptions</h1>
          <p className="page-description">
            View and manage your subscription plans, add-ons, and billing preferences.
          </p>
        </div>

        <SubscriptionOverview userData={userData} />
      </div>
    </DashboardShell>
  );
}

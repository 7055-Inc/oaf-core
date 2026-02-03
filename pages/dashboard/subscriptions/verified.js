/**
 * Verified Artist Subscriptions Page
 * 
 * Verified artist subscription management.
 * Uses legacy slide-in component wrapped in page layout.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { VerifiedSubscription } from '../../../modules/users/components/verified';
import { authApiRequest } from '../../../lib/apiUtils';

export default function VerifiedSubscriptionsPage() {
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
        router.push('/login?redirect=/dashboard/subscriptions/verified');
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
          <title>Verified Artist | Dashboard | Brakebee</title>
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
          <title>Verified Artist | Dashboard | Brakebee</title>
        </Head>
        <div className="alert alert-error">{error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userData={userData}>
      <Head>
        <title>Verified Artist | Dashboard | Brakebee</title>
      </Head>
      
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Verified Artist</h1>
          <p className="page-description">
            Manage your verified artist subscription and unlock exclusive features.
          </p>
        </div>

        <div className="card">
          <VerifiedSubscription userData={userData} />
        </div>
      </div>
    </DashboardShell>
  );
}

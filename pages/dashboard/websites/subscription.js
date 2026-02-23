/**
 * Websites > Subscription Management
 * Shows tier selection for new users, or management for existing subscribers.
 * Uses WebsitesSubscriptionGate to handle the flow.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { WebsitesSubscriptionGate, SubscriptionManager } from '../../../modules/websites';
import { getCurrentUser } from '../../../lib/users/api';

export default function WebsiteSubscriptionPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Website Subscription | Dashboard | Brakebee</title></Head>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!userData) return null;

  return (
    <DashboardShell userData={userData}>
      <Head><title>Website Subscription | Dashboard | Brakebee</title></Head>
      <div className="dashboard-page">
        <WebsitesSubscriptionGate userData={userData}>
          <SubscriptionManager />
        </WebsitesSubscriptionGate>
      </div>
    </DashboardShell>
  );
}

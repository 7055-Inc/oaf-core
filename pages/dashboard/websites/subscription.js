/**
 * Websites > Subscription Management
 * Manage subscription tier, upgrades, downgrades, and cancellation
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { SubscriptionManager } from '../../../modules/websites';
import { authApiRequest } from '../../../lib/apiUtils';
import { hasPermission } from '../../../lib/userUtils';

export default function WebsiteSubscriptionPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await authApiRequest('users/me', { method: 'GET' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        setUserData(await res.json());
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
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) return null;

  if (!hasPermission(userData, 'sites')) {
    return (
      <>
        <Head><title>Subscription Management | Websites | Dashboard</title></Head>
        <DashboardShell userData={userData}>
          <div className="page-header"><h1>Subscription Management</h1></div>
          <div className="warning-alert">You need website permission to access subscription management.</div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head><title>Subscription Management | Websites | Dashboard</title></Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Subscription Management</h1>
          <p className="page-subtitle">Manage your website subscription tier, upgrade, downgrade, or cancel.</p>
        </div>
        
        <SubscriptionManager />
      </DashboardShell>
    </>
  );
}

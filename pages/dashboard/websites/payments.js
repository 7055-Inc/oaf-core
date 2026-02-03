/**
 * Websites > Payment Settings – Card on file for website subscription.
 * Globally styled form page wrapping StripeCardSetup.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { WebsitePaymentSettings, WebsitesSubscriptionGate } from '../../../modules/websites';
import { authApiRequest } from '../../../lib/apiUtils';
import { hasPermission } from '../../../lib/userUtils';

export default function WebsitePaymentsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const response = await authApiRequest('users/me', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error loading:', err);
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

  const canAccess = hasPermission(userData, 'sites');
  if (!canAccess) {
    return (
      <>
        <Head>
          <title>Payment Settings | Websites | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Payment Settings</h1>
          </div>
          <div className="warning-alert">
            You need website permission to manage payment settings.
          </div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Payment Settings | Websites | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <div className="page-header">
          <h1>Payment Settings</h1>
          <p className="page-subtitle">Card on file for your website subscription.</p>
        </div>
        <WebsitePaymentSettings />
      </DashboardShell>
    </>
  );
}

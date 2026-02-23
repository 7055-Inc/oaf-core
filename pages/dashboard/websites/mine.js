import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { MySites, WebsitesSubscriptionGate } from '../../../modules/websites';
import { getCurrentUser } from '../../../lib/users/api';
import { hasPermission } from '../../../lib/userUtils';

export default function MySitesPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
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
        <Head><title>My Sites | Websites | Dashboard</title></Head>
        <DashboardShell userData={userData}>
          <div className="page-header"><h1>My Sites</h1></div>
          <div className="warning-alert">You need website permission to manage sites.</div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head><title>My Sites | Websites | Dashboard</title></Head>
      <DashboardShell userData={userData}>
        <WebsitesSubscriptionGate userData={userData}>
          <>
            <div className="page-header">
              <h1>My Sites</h1>
              <p className="page-subtitle">Manage your websites. Visit, manage settings, or deactivate.</p>
            </div>
            <MySites />
          </>
        </WebsitesSubscriptionGate>
      </DashboardShell>
    </>
  );
}

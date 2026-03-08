/**
 * Websites > Site Settings – General site settings (gate-protected).
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DashboardShell } from '../../../modules/dashboard/components/layout';
import { WebsitesSubscriptionGate } from '../../../modules/websites';
import { getCurrentUser } from '../../../lib/users/api';
import { hasPermission } from '../../../lib/userUtils';

export default function WebsiteSettingsPage() {
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
        <Head><title>Site Settings | Websites | Dashboard</title></Head>
        <DashboardShell userData={userData}>
          <div className="page-header"><h1>Site Settings</h1></div>
          <div className="warning-alert">You need website permission to access site settings.</div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head><title>Site Settings | Websites | Dashboard</title></Head>
      <DashboardShell userData={userData}>
        <WebsitesSubscriptionGate userData={userData}>
          <>
            <div className="page-header">
              <h1>Site Settings</h1>
              <p className="page-subtitle">General settings for your websites.</p>
            </div>
            <div className="form-card">
              <p style={{ marginBottom: '16px' }}>Manage individual site settings (name, title, domain, customization) from <Link href="/dashboard/websites/mine">My Sites</Link> → Manage for each site.</p>
              <Link href="/dashboard/websites/mine" className="primary">Go to My Sites</Link>
            </div>
          </>
        </WebsitesSubscriptionGate>
      </DashboardShell>
    </>
  );
}

/**
 * Manage Site Page – Single-site management (settings, domain, customize, templates, addons).
 * Activate/Deactivate at top. Uses SiteManage component.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { SiteManage, WebsitesSubscriptionGate } from '../../../../modules/websites';
import { getCurrentUser } from '../../../../lib/users/api';
import { fetchWebsitesSubscription } from '../../../../lib/websites/api';
import { hasPermission } from '../../../../lib/userUtils';

export default function ManageSitePage() {
  const router = useRouter();
  const { id: siteId } = router.query;
  const [userData, setUserData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        setUserData(user);

        try {
          const sub = await fetchWebsitesSubscription();
          setSubscriptionData(sub);
        } catch (_) {
          setSubscriptionData(null);
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
          <title>Manage Site | Websites | Dashboard</title>
        </Head>
        <DashboardShell userData={userData}>
          <div className="page-header">
            <h1>Manage Site</h1>
          </div>
          <div className="warning-alert">
            You need website permission to manage sites.
          </div>
        </DashboardShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Manage Site | Websites | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        <WebsitesSubscriptionGate userData={userData}>
          <>
            <div className="page-header">
              <h1>Manage Site</h1>
              <p className="page-subtitle">Settings, custom domain, customization, templates, and addons.</p>
            </div>
            <SiteManage siteId={siteId} userData={userData} subscriptionData={subscriptionData} />
          </>
        </WebsitesSubscriptionGate>
      </DashboardShell>
    </>
  );
}

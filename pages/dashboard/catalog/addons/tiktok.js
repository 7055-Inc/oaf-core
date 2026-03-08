/**
 * TikTok Connector Page
 * Catalog > Addons > TikTok Connector
 * Vendor-facing: TikTok Shop connection and product data.
 * Uses ConnectorSubscriptionGate for tier/terms/card flow.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { TikTokConnector } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';
import { isAdmin } from '../../../../lib/userUtils';
import ConnectorSubscriptionGate from '../../../../modules/catalog/components/ConnectorSubscriptionGate';
import { TIKTOK_CONNECTOR_OPTS } from '../../../../modules/catalog/components/connectorSubscriptionConfig';

export default function TikTokConnectorPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUserData(data);
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <>
      <Head>
        <title>TikTok Connector | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        {isAdmin(userData) ? (
          <>
            <div className="page-header">
              <h1>TikTok Connector</h1>
              <p className="page-subtitle">Connect your TikTok Shop and manage product listings</p>
            </div>
            <TikTokConnector userData={userData} />
          </>
        ) : (
          <ConnectorSubscriptionGate
            addonSlug="tiktok-connector"
            userData={userData}
            connectorOpts={TIKTOK_CONNECTOR_OPTS}
          >
            <div className="page-header">
              <h1>TikTok Connector</h1>
              <p className="page-subtitle">Connect your TikTok Shop and manage product listings</p>
            </div>
            <TikTokConnector userData={userData} />
          </ConnectorSubscriptionGate>
        )}
      </DashboardShell>
    </>
  );
}

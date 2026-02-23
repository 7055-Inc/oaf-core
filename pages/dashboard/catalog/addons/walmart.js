/**
 * Walmart Connector Page
 * Catalog > Addons > Walmart Connector
 * Vendor-facing: list products, add/manage Walmart listings.
 * Uses ConnectorSubscriptionGate for tier/terms/card flow.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardShell } from '../../../../modules/dashboard/components/layout';
import { WalmartConnector } from '../../../../modules/catalog';
import { getCurrentUser } from '../../../../lib/users/api';
import { isAdmin } from '../../../../lib/userUtils';
import ConnectorSubscriptionGate from '../../../../modules/catalog/components/ConnectorSubscriptionGate';
import { WALMART_CONNECTOR_OPTS } from '../../../../modules/catalog/components/connectorSubscriptionConfig';

export default function WalmartConnectorPage() {
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
        <title>Walmart Connector | Catalog | Dashboard</title>
      </Head>
      <DashboardShell userData={userData}>
        {isAdmin(userData) ? (
          <>
            <div className="page-header">
              <h1>Walmart Connector</h1>
              <p className="page-subtitle">List your products on Walmart.com through Brakebee&apos;s seller account</p>
            </div>
            <WalmartConnector userData={userData} />
          </>
        ) : (
          <ConnectorSubscriptionGate
            addonSlug="walmart-connector"
            userData={userData}
            connectorOpts={WALMART_CONNECTOR_OPTS}
          >
            <div className="page-header">
              <h1>Walmart Connector</h1>
              <p className="page-subtitle">List your products on Walmart.com through Brakebee&apos;s seller account</p>
            </div>
            <WalmartConnector userData={userData} />
          </ConnectorSubscriptionGate>
        )}
      </DashboardShell>
    </>
  );
}
